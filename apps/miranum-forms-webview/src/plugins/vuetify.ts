import Vue from "vue";
import Vuetify from "vuetify/lib";
import { ThemeOptions } from "vuetify/types/services/theme";

Vue.use(Vuetify);

const opts: ThemeOptions = {
    themes: {
        light: {
            primary: "#82B1FF",
            secondary: "#424242",
            accent: "#82B1FF",
            error: "#FF5252",
            info: "#FF5252",
            success: "#4CAF50",
            warning: "#FFC107",
        },
        dark: {
            primary: "#FF5252",
            secondary: "#424242",
            accent: "#82B1FF",
            error: "#FF5252",
            info: "#2196F3",
            success: "#4CAF50",
            warning: "#FFC107",
        },
    },
};

export default new Vuetify({ theme: opts });
