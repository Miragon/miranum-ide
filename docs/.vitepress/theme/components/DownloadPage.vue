<script setup lang="ts">
import { ref, computed, onMounted, type Component } from "vue";
import { withBase } from "vitepress";
import AppleIcon from "../icons/AppleIcon.vue";
import WindowsIcon from "../icons/WindowsIcon.vue";
import LinuxIcon from "../icons/LinuxIcon.vue";
import VSCodeIcon from "../icons/VSCodeIcon.vue";
import IntelliJIcon from "../icons/IntelliJIcon.vue";
import { fetchLatestStandaloneRelease, type StandaloneRelease } from "../utils/release";
import "./DownloadPage.css";

const MARKETPLACE_URL =
    "https://marketplace.visualstudio.com/items?itemName=miragon-gmbh.vs-code-bpmn-modeler";
const OPEN_VSX_URL = "https://open-vsx.org/extension/miragon-gmbh/vs-code-bpmn-modeler";
const JETBRAINS_MARKETPLACE_URL = "https://plugins.jetbrains.com/plugin/32634-miragon-bpmn-modeler";
const RELEASES_URL = "https://github.com/Miragon/bpmn-modeler/releases";
const HOMEBREW_TAP_CMD = "brew tap miragon/tap";
const HOMEBREW_INSTALL_CMD = "brew install --cask miragon-bpmn-modeler";
const HOMEBREW_FULL_CMD = `${HOMEBREW_TAP_CMD}\n${HOMEBREW_INSTALL_CMD}`;

interface Platform {
    name: string;
    format: string;
    icon: Component;
    url: string;
    external: boolean;
}

const release = ref<StandaloneRelease | null>(null);
const copyState = ref<"idle" | "copied">("idle");

const macPrimaryUrl = computed(() => release.value?.dmgArm64Url ?? RELEASES_URL);
const macAltUrl = computed(() => release.value?.dmgIntelUrl ?? null);

// Windows and Linux packages ride along with the macOS DMG on the same release.
const winUrl = computed(() => release.value?.exeX64Url ?? RELEASES_URL);
const linuxUrl = computed(() => release.value?.flatpakX86_64Url ?? RELEASES_URL);

const platforms = computed<Platform[]>(() => [
    { name: "macOS", format: "DMG", icon: AppleIcon, url: macPrimaryUrl.value, external: false },
    {
        name: "Windows",
        format: "Installer (.exe)",
        icon: WindowsIcon,
        url: winUrl.value,
        external: false,
    },
    {
        name: "Linux (x86_64)",
        format: "Flatpak bundle",
        icon: LinuxIcon,
        url: linuxUrl.value,
        external: false,
    },
    {
        name: "VS Code extension",
        format: "VS Code Marketplace",
        icon: VSCodeIcon,
        url: MARKETPLACE_URL,
        external: true,
    },
    {
        name: "VS Code extension",
        format: "Open VSX (VSCodium, Cursor and others)",
        icon: VSCodeIcon,
        url: OPEN_VSX_URL,
        external: true,
    },
    {
        name: "IntelliJ IDEA",
        format: "JetBrains Marketplace",
        icon: IntelliJIcon,
        url: JETBRAINS_MARKETPLACE_URL,
        external: true,
    },
]);

onMounted(async () => {
    release.value = await fetchLatestStandaloneRelease();
});

async function copyHomebrew() {
    try {
        await navigator.clipboard.writeText(HOMEBREW_FULL_CMD);
        copyState.value = "copied";
        setTimeout(() => (copyState.value = "idle"), 1500);
    } catch {
        // Clipboard API blocked; ignore.
    }
}
</script>

<template>
    <main class="dl-page">
        <section class="dl-hero">
            <div class="dl-hero-text">
                <h1 class="dl-h1">Download the Miragon BPMN Modeler</h1>
                <p class="dl-sub">
                    Edit BPMN, DMN and Camunda Forms in VS Code, IntelliJ or the desktop app. Free
                    and open source.
                </p>
                <div class="dl-cta">
                    <a class="dl-btn dl-btn-lg" :href="macPrimaryUrl">Download for macOS</a>
                    <a
                        class="dl-btn dl-btn-lg"
                        :href="MARKETPLACE_URL"
                        target="_blank"
                        rel="noopener"
                    >
                        <VSCodeIcon />
                        Install the VS Code extension
                    </a>
                </div>
                <p class="dl-meta">
                    <a v-if="macAltUrl" :href="macAltUrl">Mac with Intel chip</a>
                    <span v-if="macAltUrl" aria-hidden="true"> · </span>
                    <a :href="OPEN_VSX_URL" target="_blank" rel="noopener">Extension on Open VSX</a>
                </p>
            </div>
            <div class="dl-preview">
                <img
                    :src="withBase('/standalone-preview-light.png')"
                    alt="The Miragon BPMN Modeler desktop app with a BPMN diagram"
                    class="dl-preview-img cd-nur-hell"
                />
                <img
                    :src="withBase('/standalone-preview-dark.png')"
                    alt="The Miragon BPMN Modeler desktop app with a BPMN diagram"
                    class="dl-preview-img cd-nur-dunkel"
                />
            </div>
        </section>

        <section class="dl-platforms" aria-labelledby="dl-platforms-title">
            <h2 id="dl-platforms-title" class="dl-h2">All platforms</h2>
            <ul class="dl-list">
                <li v-for="platform in platforms" :key="platform.format" class="dl-row">
                    <span class="dl-icon-sq"><component :is="platform.icon" /></span>
                    <span class="dl-row-name">{{ platform.name }}</span>
                    <span class="dl-row-format">{{ platform.format }}</span>
                    <a
                        class="dl-btn"
                        :href="platform.url"
                        :target="platform.external ? '_blank' : undefined"
                        :rel="platform.external ? 'noopener' : undefined"
                        >{{ platform.external ? "Install" : "Download" }}</a
                    >
                </li>
            </ul>

            <div class="dl-extras">
                <div class="dl-card">
                    <h3 class="dl-card-label">Homebrew (macOS)</h3>
                    <div class="dl-code">
                        <pre><span class="dl-prompt">$ </span>{{ HOMEBREW_TAP_CMD }}
<span class="dl-prompt">$ </span>{{ HOMEBREW_INSTALL_CMD }}</pre>
                        <button
                            type="button"
                            class="dl-copy"
                            @click="copyHomebrew"
                            :aria-label="
                                copyState === 'copied'
                                    ? 'Copied to clipboard'
                                    : 'Copy command to clipboard'
                            "
                        >
                            {{ copyState === "copied" ? "Copied" : "Copy" }}
                        </button>
                    </div>
                </div>
                <div class="dl-card">
                    <h3 class="dl-card-label">All files and older versions</h3>
                    <a class="dl-link" :href="RELEASES_URL" target="_blank" rel="noopener"
                        >GitHub Releases</a
                    >
                </div>
            </div>
        </section>
    </main>
</template>
