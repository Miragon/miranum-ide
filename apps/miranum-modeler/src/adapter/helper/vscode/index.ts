export * from "./editor";

export let isChangeDocumentEventBlocked = false;

export function blockChangeDocumentEvent(value: boolean) {
    isChangeDocumentEventBlocked = value;
}
