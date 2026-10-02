// Lets any section send a visitor to the contact form with a case type
// already selected. Contact listens for this event.
export const CONSULTATION_REQUEST_EVENT = "spectrum:request-consultation";

export type ConsultationRequestDetail = { caseType: string };

export function requestConsultation(caseType: string) {
  window.dispatchEvent(
    new CustomEvent<ConsultationRequestDetail>(CONSULTATION_REQUEST_EVENT, {
      detail: { caseType },
    })
  );
}
