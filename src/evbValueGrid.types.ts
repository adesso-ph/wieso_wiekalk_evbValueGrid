export interface ErvoRecord {
    id: string;
    year: number;
}

export interface EvbValueRecord {
    id: string | null;
    yearAfter: number;
    value: number | null;
}

export interface YearColumnData {
    year: number;
    ervoId: string | null;
    valueMap: Map<number, EvbValueRecord>;
}
