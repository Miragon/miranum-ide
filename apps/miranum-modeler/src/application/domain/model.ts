export class BpmnModelerSetting {
    constructor(
        public readonly alignToOrigin: boolean,
        public readonly darkTheme: boolean,
    ) {}
}

export class SettingBuilder {
    private _alignToOrigin = false;

    private _darkTheme = false;

    alignToOrigin(value: boolean): SettingBuilder {
        this._alignToOrigin = value;
        return this;
    }

    darkTheme(value: boolean): SettingBuilder {
        this._darkTheme = value;
        return this;
    }

    buildBpmnModeler(): BpmnModelerSetting {
        return new BpmnModelerSetting(this._alignToOrigin, this._darkTheme);
    }
}
