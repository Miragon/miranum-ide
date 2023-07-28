import templateElementFactory from "./create";

import { ExtendedElementTemplates } from "./ExtendedElementTemplates";

export default {
    __depends__: [templateElementFactory],
    __init__: ["extendedElementTemplates"],
    extendedElementTemplates: ["type", ExtendedElementTemplates],
};
