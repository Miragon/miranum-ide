import templateElementFactory from "./create";

import { ExtendElementTemplates } from "./ExtendElementTemplates";

export default {
    __depends__: [templateElementFactory],
    __init__: ["extendedElementTemplates"],
    extendedElementTemplates: ["type", ExtendElementTemplates],
};
