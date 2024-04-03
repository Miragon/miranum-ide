import { describe, expect, it } from "vitest";

import { mount } from "@vue/test-utils";
import App from "./App.vue";
import { createVuetify } from "vuetify";

const vuetify = createVuetify();

describe("App", () => {
    it("renders properly", () => {
        const wrapper = mount(App, { plugins: [vuetify] });
        expect(wrapper.text()).toContain("No applicable renderer found.");
    });
});
