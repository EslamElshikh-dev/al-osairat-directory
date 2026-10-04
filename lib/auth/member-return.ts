const RETURN_KEY = 'osairat.memberReturn';
const SUBMISSION_DESTINATION = '/account#business-submissions';

export function rememberMemberReturnFromHash() {
  try {
    if (window.location.hash === '#business-submissions') {
      window.sessionStorage.setItem(RETURN_KEY, SUBMISSION_DESTINATION);
    }
  } catch {
    // Private browsing may disable session storage; normal account navigation still works.
  }
}

export function consumeMemberReturn() {
  try {
    const destination = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    if (destination === SUBMISSION_DESTINATION) return destination;
  } catch {
    // Continue to the account overview when storage is unavailable.
  }
  return '/account';
}
