// Lets any section send a visitor to the contact form with a case type
// already selected. Contact listens for this event.
export const CONSULTATION_REQUEST_EVENT = "spectrum:request-consultation";

export type ConsultationRequestDetail = {
  caseType: string;
  /** The reel the request came from, saved with the lead. */
  reelId?: string;
};

export function requestConsultation(caseType: string, reelId?: string) {
  window.dispatchEvent(
    new CustomEvent<ConsultationRequestDetail>(CONSULTATION_REQUEST_EVENT, {
      detail: { caseType, reelId },
    })
  );
}
