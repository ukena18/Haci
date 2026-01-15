// src/utils/labels.js

export const PAYMENT_METHOD = {
  CASH: "cash",
  CARD: "card",
  TRANSFER: "transfer",
};

export const PAYMENT_METHOD_LABEL_TR = {
  [PAYMENT_METHOD.CASH]: "Nakit",
  [PAYMENT_METHOD.CARD]: "Kart",
  [PAYMENT_METHOD.TRANSFER]: "Havale",
};

export const PAYMENT_METHOD_ICON = {
  [PAYMENT_METHOD.CASH]: "fa-money-bill-wave",
  [PAYMENT_METHOD.CARD]: "fa-credit-card",
  [PAYMENT_METHOD.TRANSFER]: "fa-building-columns",
};

export const PAYMENT_TYPE = {
  PAYMENT: "payment",
  DEBT: "debt",
};

export const PAYMENT_TYPE_LABEL_TR = {
  [PAYMENT_TYPE.PAYMENT]: "Tahsilat",
  [PAYMENT_TYPE.DEBT]: "Borç",
};

export const JOB_STATUS_LABEL_TR = {
  open: "Açık",
  completed: "Tamamlandı",
};
