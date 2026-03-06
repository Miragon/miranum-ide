/**
 * Value object representing the current BPMN modeler display settings.
 */
export class BpmnModelerSetting {
    constructor(
        public readonly alignToOrigin: boolean,
        public readonly darkTheme: boolean,
    ) {}
}

/**
 * Fluent builder for {@link BpmnModelerSetting}.
 */
export class SettingBuilder {
    private _alignToOrigin = false;

    private _darkTheme = false;

    /** Sets the alignToOrigin flag. */
    alignToOrigin(value: boolean): SettingBuilder {
        this._alignToOrigin = value;
        return this;
    }

    /** Sets the darkTheme flag. */
    darkTheme(value: boolean): SettingBuilder {
        this._darkTheme = value;
        return this;
    }

    /** Builds and returns a {@link BpmnModelerSetting} instance. */
    buildBpmnModeler(): BpmnModelerSetting {
        return new BpmnModelerSetting(this._alignToOrigin, this._darkTheme);
    }
}
