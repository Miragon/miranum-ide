/**
 * Value object representing the current BPMN modeler display settings.
 */
export class BpmnModelerSetting {
    constructor(
        public readonly alignToOrigin: boolean,
        public readonly showTransactionBoundaries: boolean,
    ) {}
}

/**
 * Fluent builder for {@link BpmnModelerSetting}.
 */
export class SettingBuilder {
    private _alignToOrigin = false;

    private _showTransactionBoundaries = true;

    /** Sets the alignToOrigin flag. */
    alignToOrigin(value: boolean): SettingBuilder {
        this._alignToOrigin = value;
        return this;
    }

    /** Sets the showTransactionBoundaries flag. */
    showTransactionBoundaries(value: boolean): SettingBuilder {
        this._showTransactionBoundaries = value;
        return this;
    }

    /** Builds and returns a {@link BpmnModelerSetting} instance. */
    buildBpmnModeler(): BpmnModelerSetting {
        return new BpmnModelerSetting(
            this._alignToOrigin,
            this._showTransactionBoundaries,
        );
    }
}
