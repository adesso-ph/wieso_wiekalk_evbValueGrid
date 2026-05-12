import type { ErvoRecord, EvbValueRecord } from './evbValueGrid.types';

export class D365Api {
    constructor(private xrm: any) {}

    async getErvo(ervoId: string): Promise<ErvoRecord> {
        const result = await this.xrm.WebApi.retrieveRecord(
            'wieso_remunerationguidelinesordinance',
            ervoId,
            '?$select=wieso_year'
        );
        return { id: ervoId, year: Number(result.wieso_year) };
    }

    async findErvoByYear(year: number): Promise<string | null> {
        const result = await this.xrm.WebApi.retrieveMultipleRecords(
            'wieso_remunerationguidelinesordinance',
            `?$filter=wieso_year eq '${year}'&$select=wieso_year&$top=1`
        );
        console.log('findErvoByYear entity:', result.entities[0]);
        return result.entities.length > 0 ? result.entities[0].wieso_remunerationguidelinesordinanceid : null;
    }

    async getEvbValues(ervoId: string): Promise<EvbValueRecord[]> {
        const result = await this.xrm.WebApi.retrieveMultipleRecords(
            'wieso_evbvalues',
            `?$filter=_wieso_ervo_id_value eq ${ervoId}&$select=wieso_evbvaluesid,wieso_yearafter_int,wieso_value_dec`
        );
        console.log('Fetched EVB values:', result);
        return result.entities.map((e: any) => ({
            id: e.wieso_evbvaluesid as string,
            yearAfter: e.wieso_yearafter_int as number,
            value: e.wieso_value_dec !== undefined ? (e.wieso_value_dec as number) : null
        }));
    }

    async saveEvbValue(ervoId: string, record: EvbValueRecord, newValue: number): Promise<string> {
        if (record.id) {
            await this.xrm.WebApi.updateRecord('wieso_evbvalues', record.id, {
                wieso_value_dec: newValue
            });
            return record.id;
        }
        // No existing record — create a new one
        const created = await this.xrm.WebApi.createRecord('wieso_evbvalues', {
            'wieso_ervo_id@odata.bind': `/wieso_remunerationguidelinesordinances(${ervoId})`,
            wieso_yearafter_int: record.yearAfter,
            wieso_value_dec: newValue
        });
        return created.id as string;
    }
}
