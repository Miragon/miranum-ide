import type BaseViewer from "bpmn-js/lib/BaseViewer";
import type Canvas from "diagram-js/lib/core/Canvas";
import {
    type DisposableStore,
    MutableDisposable,
    NoModelerError,
} from "@miragon/bpmn-modeler-types";

import { installSurfaceFocusFeatures, type SurfaceFocusOptions } from "./focusFeatures";
import { armInitialViewportPolicy } from "./initialViewport";
import type { ThemeMode } from "./publicApi";
import { CanvasRootElementManager, type RootElementManager } from "./rootElement";
import { ElementSelectionManager, type SelectionManager } from "./selection";
import { ThemeController } from "./theme";
import {
    applyViewState as applyViewStateComposition,
    captureViewState as captureViewStateComposition,
    type ViewState,
    type ViewStateManagers,
} from "./viewState";
import { CanvasViewportManager, type ViewportManager } from "./viewport";

type SurfaceInstance = Pick<BaseViewer, "get" | "destroy">;

/** The DI lookups a live surface offers to the helpers composed around it. */
export interface SurfaceServices {
    /** @throws {NoModelerError} If no bpmn-js instance is live. */
    service<S>(name: string): S;
    /** `undefined` when the instance was built without the service. */
    optionalService<S>(name: string): S | undefined;
}

/**
 * The plumbing every surface facade (modeler, designer, viewer) composes: the
 * bpmn-js instance and its teardown, the viewport/selection/root-element
 * managers, view-state capture, the initial-viewport fit, focus features and
 * the theme controller. The facade owns the {@link DisposableStore} and hands
 * it in, so registration order — and with it LIFO teardown — stays the
 * facade's.
 */
export class SurfaceCore<T extends SurfaceInstance> implements SurfaceServices {
    private liveInstance: T | undefined;

    private managers: ViewStateManagers | undefined;

    private themeController: ThemeController | undefined;

    // Re-armed per import, so it can't be a plain store entry; replaced per allocation.
    private initialViewportObserver = new MutableDisposable();

    /**
     * @param container The canvas host the bpmn-js instance attaches to.
     * @param themeRoots The roots that carry this instance's `data-bpmn-theme`.
     */
    constructor(
        private readonly container: HTMLElement,
        private readonly themeRoots: readonly HTMLElement[],
    ) {}

    /** @throws {NoModelerError} If no bpmn-js instance is live. */
    get instance(): T {
        if (!this.liveInstance) {
            throw new NoModelerError();
        }
        return this.liveInstance;
    }

    get viewport(): ViewportManager {
        return this.liveManagers().viewport;
    }

    get selection(): SelectionManager {
        return this.liveManagers().selection;
    }

    get rootElement(): RootElementManager {
        return this.liveManagers().rootElement;
    }

    /**
     * Constructs the bpmn-js instance and registers, in this order, its
     * destruction, the initial-viewport observer and the focus features on
     * `store`.
     */
    allocate(store: DisposableStore, construct: () => T, focus: SurfaceFocusOptions): void {
        try {
            this.liveInstance = construct();
        } catch (error) {
            // A partially-constructed bpmn-js attaches `.bjs-container` with no
            // handle to destroy; clear the dedicated container before rethrowing.
            this.container.replaceChildren();
            throw error;
        }
        store.add(() => {
            this.liveInstance?.destroy();
            this.liveInstance = undefined;
        });
        const initialViewportObserver = new MutableDisposable();
        this.initialViewportObserver = initialViewportObserver;
        store.add(() => initialViewportObserver.dispose());

        const accessor = <S>(name: string): S => this.service<S>(name);
        this.managers = {
            viewport: new CanvasViewportManager(accessor),
            selection: new ElementSelectionManager(accessor),
            rootElement: new CanvasRootElementManager(accessor),
        };

        store.add(installSurfaceFocusFeatures(accessor, focus));
    }

    /** Drops the managers once the facade's store has torn the instance down. */
    releaseManagers(): void {
        this.managers = undefined;
    }

    service<S>(name: string): S {
        return this.instance.get<S>(name);
    }

    optionalService<S>(name: string): S | undefined {
        return this.instance.get<S>(name, false) ?? undefined;
    }

    captureViewState(): ViewState {
        return captureViewStateComposition(this.liveManagers());
    }

    applyViewState(state: ViewState): void {
        applyViewStateComposition(this.liveManagers(), state);
    }

    /** Arms the one-time initial fit for the diagram that was just imported. */
    armInitialViewport(): void {
        this.initialViewportObserver.set(
            armInitialViewportPolicy(this.service<Canvas>("canvas"), this.viewport),
        );
    }

    /** A no-op once `store` is disposed, so a destroyed surface keeps no theme residue. */
    setTheme(store: DisposableStore, theme: ThemeMode): void {
        if (store.isDisposed) {
            return;
        }
        if (!this.themeController) {
            this.themeController = new ThemeController(this.themeRoots);
            store.add(() => {
                this.themeController?.dispose();
                // A replacement store on the same surface must be able to rebuild it.
                this.themeController = undefined;
            });
        }
        this.themeController.setMode(theme);
    }

    private liveManagers(): ViewStateManagers {
        if (!this.managers) {
            throw new NoModelerError();
        }
        return this.managers;
    }
}
