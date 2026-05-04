import type { ErvoRecord, EvbValueRecord } from './evbValueGrid.types';

export class D365Api {
    constructor(private xrm: any) {}

    async getErvo(ervoId: string): Promise<ErvoRecord> {
        const result = await this.xrm.WebApi.retrieveRecord(
            'play_ervo',
            ervoId,
            '?$select=play_year_int'
        );
        return { id: ervoId, year: result.play_year_int };
    }

    async findErvoByYear(year: number): Promise<string | null> {
        const result = await this.xrm.WebApi.retrieveMultipleRecords(
            'play_ervo',
            `?$filter=play_year_int eq ${year}&$select=play_year_int&$top=1`
        );
        return result.entities.length > 0 ? result.entities[0].play_ervoid : null;
    }

    async getEvbValues(ervoId: string): Promise<EvbValueRecord[]> {
        const result = await this.xrm.WebApi.retrieveMultipleRecords(
            'play_evbvalue',
            `?$filter=_play_ervoid_value eq ${ervoId}&$select=play_evbvalueid,play_yearafter_int,play_value_dec`
        );
        return result.entities.map((e: any) => ({
            id: e.play_evbvalueid as string,
            yearAfter: e.play_yearafter_int as number,
            value: e.play_value_dec !== undefined ? (e.play_value_dec as number) : null
        }));
    }

    async saveEvbValue(ervoId: string, record: EvbValueRecord, newValue: number): Promise<string> {
        if (record.id) {
            await this.xrm.WebApi.updateRecord('play_evbvalue', record.id, {
                play_value_dec: newValue
            });
            return record.id;
        }
        // No existing record — create a new one
        const created = await this.xrm.WebApi.createRecord('play_evbvalue', {
            'play_ervoid@odata.bind': `/play_ervos(${ervoId})`,
            play_yearafter_int: record.yearAfter,
            play_value_dec: newValue
        });
        return created.id as string;
    }
}
