export class ExtendedElementTemplates {
    constructor(elementTemplates, templateElementFactory) {
        if (elementTemplates.__proto__.createElement) {
            return;
        }

        elementTemplates.__proto__.createElement = (template) => {
            if (!template) {
                throw new Error("template is missing");
            }

            return templateElementFactory.create(template);
        };
    }
}

ExtendedElementTemplates.$inject = ["elementTemplates", "templateElementFactory"];
