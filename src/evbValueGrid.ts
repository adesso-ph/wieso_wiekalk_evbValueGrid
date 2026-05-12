import type { YearColumnData } from './evbValueGrid.types';
import { D365Api } from './dynamics365Api';

const YEAR_AFTER_COUNT = 30;

export class EvbValueGrid {
    private columns: YearColumnData[] = [];
    private pendingChanges = new Map<number, number>(); // yearAfter -> new value

    constructor(
        private container: HTMLElement,
        private api: D365Api,
        private currentErvoId: string
    ) {}

    async loadData(): Promise<void> {
        const ervo = await this.api.getErvo(this.currentErvoId);

        // Current year column
        const currentValues = await this.api.getEvbValues(this.currentErvoId);
        const currentMap = new Map(currentValues.map(v => [v.yearAfter, v]));
        this.columns = [{ year: ervo.year, ervoId: this.currentErvoId, valueMap: currentMap }];

        // Previous 3 years
        for (let offset = 1; offset <= 3; offset++) {
            const prevYear = ervo.year - offset;
            const prevId = await this.api.findErvoByYear(prevYear);
            const prevMap = new Map();
            if (prevId) {
                const prevValues = await this.api.getEvbValues(prevId);
                prevValues.forEach(v => prevMap.set(v.yearAfter, v));
            }
            this.columns.push({ year: prevYear, ervoId: prevId, valueMap: prevMap });
        }
    }

    render(): void {
        this.container.innerHTML = this.buildHtml();
        this.bindEvents();
    }

    private buildHtml(): string {
        const headerCells = this.columns.map((col, i) => {
            const cls = i === 0 ? ' class="col-current"' : '';
            return `<th${cls}>${col.year}</th>`;
        }).join('');

        const bodyRows = Array.from({ length: YEAR_AFTER_COUNT }, (_, idx) => {
            const yearAfter = idx + 1;
            const rowLabel = yearAfter === YEAR_AFTER_COUNT ? '30 ff' : String(yearAfter);
            const cells = this.columns.map((col, colIdx) => {
                const record = col.valueMap.get(yearAfter);
                const val = record?.value ?? null;

                if (colIdx === 0) {
                    const displayVal = val !== null ? val.toFixed(2) : '';
                    return `<td class="col-current"><input
                        class="value-input"
                        data-year-after="${yearAfter}"
                        type="number"
                        step="0.01"
                        value="${displayVal}"
                        autocomplete="off"
                    ></td>`;
                }

                if (val !== null) {
                    const formatted = val.toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    return `<td class="col-readonly"><span class="value-text">${formatted}</span></td>`;
                }
                return `<td class="col-readonly"><span class="value-empty">–</span></td>`;
            }).join('');

            return `<tr><td class="col-label">${rowLabel}</td>${cells}</tr>`;
        }).join('');

        return `
<div class="table-wrapper">
    <table>
        <thead>
            <tr>
                <th class="col-label-header">Jahr nach Bezug</th>
                ${headerCells}
            </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
    </table>
</div>
<div class="footer">
    <span id="saveStatus" class="status-text"></span>
    <button id="btnSave" class="btn-primary" disabled>Speichern</button>
</div>`;
    }

    private bindEvents(): void {
        this.container.querySelectorAll<HTMLInputElement>('.value-input').forEach(input => {
            const yearAfter = Number(input.dataset.yearAfter);
            const originalValue = this.columns[0].valueMap.get(yearAfter)?.value ?? null;

            input.addEventListener('blur', async () => {
                const parsed = Number(input.value);
                if (input.value !== '' && !isNaN(parsed)) {
                    input.value = parsed.toFixed(2);
                }

                if (!this.pendingChanges.has(yearAfter)) return;

                const newValue = this.pendingChanges.get(yearAfter)!;
                try {
                    const existing = this.columns[0].valueMap.get(yearAfter)
                        ?? { id: null, yearAfter, value: null };
                    const savedId = await this.api.saveEvbValue(this.currentErvoId, existing, newValue);
                    this.columns[0].valueMap.set(yearAfter, { id: savedId, yearAfter, value: newValue });
                    this.pendingChanges.delete(yearAfter);

                    input.classList.remove('dirty');
                    input.classList.add('save-success');
                    input.addEventListener('animationend', () => input.classList.remove('save-success'), { once: true });

                    const saveBtn = document.getElementById('btnSave') as HTMLButtonElement;
                    if (saveBtn) saveBtn.disabled = this.pendingChanges.size === 0;
                } catch (err) {
                    console.error('Auto-save failed:', err);
                }
            });

            input.addEventListener('input', () => {
                const raw = input.value.trim();
                const parsed = raw === '' ? null : Number(raw);
                const isChanged = parsed !== originalValue && !(parsed === null && originalValue === null);
                const isValid = parsed !== null && !isNaN(parsed);

                if (isChanged && isValid) {
                    this.pendingChanges.set(yearAfter, parsed);
                    input.classList.add('dirty');
                } else {
                    this.pendingChanges.delete(yearAfter);
                    input.classList.remove('dirty');
                }

                const saveBtn = document.getElementById('btnSave') as HTMLButtonElement;
                saveBtn.disabled = this.pendingChanges.size === 0;
            });
        });

        document.getElementById('btnSave')!.addEventListener('click', () => this.save());
    }

    private async save(): Promise<void> {
        const btn = document.getElementById('btnSave') as HTMLButtonElement;
        const status = document.getElementById('saveStatus')!;

        btn.disabled = true;
        status.textContent = 'Wird gespeichert…';
        status.className = 'status-text';

        try {
            const savePromises = Array.from(this.pendingChanges.entries()).map(
                async ([yearAfter, newValue]) => {
                    const existing = this.columns[0].valueMap.get(yearAfter)
                        ?? { id: null, yearAfter, value: null };
                    const savedId = await this.api.saveEvbValue(this.currentErvoId, existing, newValue);
                    this.columns[0].valueMap.set(yearAfter, { id: savedId, yearAfter, value: newValue });
                }
            );

            await Promise.all(savePromises);
            this.pendingChanges.clear();

            this.container.querySelectorAll<HTMLInputElement>('.value-input.dirty')
                .forEach(i => i.classList.remove('dirty'));

            status.textContent = 'Erfolgreich gespeichert';
            status.className = 'status-text success';
            setTimeout(() => {
                if (status.textContent === 'Erfolgreich gespeichert') status.textContent = '';
            }, 3000);
        } catch (err) {
            console.error('Save failed:', err);
            status.textContent = 'Fehler beim Speichern!';
            status.className = 'status-text error';
            btn.disabled = false;
        }
    }
}
