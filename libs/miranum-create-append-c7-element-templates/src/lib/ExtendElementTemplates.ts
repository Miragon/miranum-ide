export class ExtendElementTemplates {
    public static $inject: string[];

    constructor(elementTemplates: any, templateElementFactory: any) {
        if (elementTemplates.__proto__.createElement) {
            return;
        }

        elementTemplates.__proto__.createElement = (template: any) => {
            if (!template) {
                throw new Error("template is missing");
            }

            return templateElementFactory.create(template);
        };
    }
}

ExtendElementTemplates.$inject = ["elementTemplates", "templateElementFactory"];
