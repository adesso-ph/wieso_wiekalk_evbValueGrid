import { D365Api } from './dynamics365Api';
import { EvbValueGrid } from './evbValueGrid';

async function init(): Promise<void> {
    const loading = document.getElementById('loading')!;
    const errorEl = document.getElementById('error')!;
    const content = document.getElementById('content')!;

    try {
        // Webresources run inside an iframe; the Xrm context lives in the parent frame.
        const xrm = (window.parent as any)?.Xrm ?? (window as any).Xrm;
        if (!xrm?.WebApi) throw new Error('Xrm.WebApi nicht verfügbar');

        const ervoId = resolveErvoId(xrm);
        if (!ervoId) throw new Error('ERVO-Datensatz-ID konnte nicht ermittelt werden');

        const api = new D365Api(xrm);
        const grid = new EvbValueGrid(content, api, ervoId);

        await grid.loadData();

        loading.style.display = 'none';
        content.style.display = 'block';
        grid.render();
    } catch (err: any) {
        loading.style.display = 'none';
        errorEl.textContent = `Fehler: ${err?.message ?? String(err)}`;
        errorEl.style.display = 'block';
        console.error(err);
    }
}

function resolveErvoId(xrm: any): string | null {
    // Option 1: record ID passed as URL parameter via the web resource properties ("data" field)
    const params = new URLSearchParams(window.location.search);
    const dataParam = params.get('data');
    if (dataParam) return dataParam.replace(/[{}]/g, '');

    // Option 2: read directly from the parent form context (Xrm.Page is deprecated but widely supported)
    try {
        const id: string | undefined = xrm.Page?.data?.entity?.getId?.();
        if (id) return id.replace(/[{}]/g, '');
    } catch {
        // ignore
    }

    return null;
}

document.addEventListener('DOMContentLoaded', init);
