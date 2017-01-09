export class Constants {
    public static runSettingsExt: string = '.runsettings';
    public static testSettingsExt: string = '.testsettings';
    public static testImpactFriendlyName: string = 'Test Impact';
    public static testImpactCollectorURI: string = 'datacollector://microsoft/TestImpact/1.0';
    public static testImpactTestSettingsAgentNameTag: string = 'testImpact-5d76a195-1e43-4b90-a6ce-4ec3de87ed25';
    public static testImpactTestSettingsNameTag: string = 'testSettings-5d76a195-1e43-4b90-a6ce-4ec3de87ed25';
    public static testImpactTestSettingsIDTag: string = '5d76a195-1e43-4b90-a6ce-4ec3de87ed25';
    public static testImpactTestSettingsXmlnsTag: string = 'http://microsoft.com/schemas/VisualStudio/TeamTest/2010'
    public static testImpactAssemblyQualifiedName: string = 'Microsoft.VisualStudio.TraceCollector.TestImpactDataCollector, Microsoft.VisualStudio.TraceCollector, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a';
    public static runSettingsForParallel = '<?xml version="1.0" encoding="utf-8"?><RunSettings><RunConfiguration><MaxCpuCount>0</MaxCpuCount></RunConfiguration></RunSettings>';
}