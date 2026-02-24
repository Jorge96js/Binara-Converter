export class CreditManager {
  constructor(initialCredits = 10) {
    this.credits = parseInt(localStorage.getItem('saas_credits')) || initialCredits;
    this.listeners = [];
  }

  get balance() {
    return this.credits;
  }

  consume(amount) {
    if (this.credits < amount) return false;
    this.credits -= amount;
    this.persist();
    this.notify();
    return true;
  }

  add(amount) {
    this.credits += amount;
    this.persist();
    this.notify();
  }

  persist() {
    localStorage.setItem('saas_credits', this.credits);
  }

  subscribe(callback) {
    this.listeners.push(callback);
    callback(this.credits);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.credits));
  }
}

export const creditManager = new CreditManager();
