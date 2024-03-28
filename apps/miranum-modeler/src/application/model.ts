export class BpmnModelerSetting {
    constructor(public readonly alignToOrigin: boolean) {}
}

export class SettingBuilder {
    private _alignToOrigin = false;

    alignToOrigin(value: boolean): SettingBuilder {
        this._alignToOrigin = value;
        return this;
    }

    buildBpmnModeler(): BpmnModelerSetting {
        return new BpmnModelerSetting(this._alignToOrigin);
    }
}
