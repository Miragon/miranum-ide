import { MiranumWorkspaceItem } from "@miranum-ide/miranum-core";

export const successfulMessageToBpmnModeler = {
    bpmn: true,
    formKeys: true,
    elementTemplates: true,
};

export const successfulMessageToDmnModeler = {
    dmn: true,
};

export const defaultFormConfig: MiranumWorkspaceItem = {
    type: "form",
    path: "forms",
    extension: ".form",
};

export const defaultElementTemplateConfig: MiranumWorkspaceItem = {
    type: "element-template",
    path: "element-templates",
    extension: ".json",
};
