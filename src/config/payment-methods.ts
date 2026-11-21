// Payment methods and their receiving accounts, kept out of the UI components.
// These are the starting values. Later they must be editable from the admin
// dashboard and read from the database. Payments are verified by hand by an
// administrator; nothing here verifies a transfer.
export const paymentMethodIds = ["bankily", "sedad"] as const;

export type PaymentMethodId = (typeof paymentMethodIds)[number];

export type PaymentMethod = {
  id: PaymentMethodId;
  accountNumber: string;
};

export const paymentMethods: Record<PaymentMethodId, PaymentMethod> = {
  bankily: { id: "bankily", accountNumber: "43 73 14 59" },
  sedad: { id: "sedad", accountNumber: "43 73 14 59" },
};
