// A new event opens the studio on Import flyer, once (see Events). The
// request is keyed by the event's link, so the editor of whichever event
// shows while the list refreshes leaves it alone.

const IMPORT_KEY = "admin_open_import";

/** Asks the editor of a new event to open Import flyer when it first shows. */
export function requestImport(slug: string) {
  try {
    sessionStorage.setItem(IMPORT_KEY, slug);
  } catch {
    // Storage blocked: the organizer opens Import flyer themselves.
  }
}

/** Whether this event's editor should open Import flyer. Read once, then cleared with clearImportRequest. */
export function importRequested(slug: string) {
  try {
    return sessionStorage.getItem(IMPORT_KEY) === slug;
  } catch {
    return false;
  }
}

export function clearImportRequest() {
  try {
    sessionStorage.removeItem(IMPORT_KEY);
  } catch {
    // Nothing was stored.
  }
}
