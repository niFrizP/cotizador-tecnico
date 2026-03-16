import { addDays, today } from "./format";

export const mkItem = () => ({
    id: crypto.randomUUID(),
    description: "",
    qty: 1,
    unitPrice: "",
    shipping: "",
    link: "",
});

export const DEF_ISS = {
    name: "",
    title: "",
    email: "",
    phone: "",
    website: "",
    bank: "",
    accountName: "",
    accountNumber: "",
    accountType: "",
    logoDataUrl: null,
};

export const mkQuote = (iss, userId = null) => ({
    id: crypto.randomUUID(),
    userId,
    number: null,
    status: "draft",
    issueDate: today(),
    validUntil: addDays(today(), 30),
    client: { name: "", contact: "", website: "", rut: "", phone: "" },
    equipment: {
        enabled: false,
        brand: "",
        model: "",
        serial: "",
        year: "",
        extra: "",
    },
    items: [mkItem()],
    notes: "",
    currency: "CLP",
    issuer: { ...iss },
});
