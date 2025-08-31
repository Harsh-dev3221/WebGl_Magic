import React, { useState, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Download,
    Copy,
    Share2,
    Code2,
    FileJson,
    FileCode,
    Globe,
    Check,
    ExternalLink
} from 'lucide-react';
import {
    ShaderExportData,
    ExportOptions,
    downloadExport,
    copyToClipboard,
    generateShareableURL,
    generateThreeJSSetup,
    generateHTMLTemplate,
    generateFragmentShaderCode
} from '@/lib/exportUtils';
import { ShaderType } from '@/lib/shaderSystem';
import { GradientConfig } from '@/lib/color/gradients';

interface ExportDialogProps {
    // Current shader configuration
    shaderType: ShaderType;
    gradientConfig: GradientConfig;
    shaderParams: {
        speed: number;
        scale: number;
        octaves: number;
        lacunarity: number;
        persistence: number;
        flowStrength?: number;
        turbulence?: number;
        plasmaIntensity?: number;
        viscosity?: number;
        pressure?: number;
        particleCount?: number;
        particleSize?: number;
        segments?: number;
        rotation?: number;
    };
    isPlaying: boolean;
    children: React.ReactNode;
}

export function ExportDialog({
    shaderType,
    gradientConfig,
    shaderParams,
    isPlaying,
    children
}: ExportDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [exportName, setExportName] = useState(`${shaderType}_shader_${Date.now()}`);
    const [exportDescription, setExportDescription] = useState('Generated from Vector Field Studio');
    const [copied, setCopied] = useState<string | null>(null);
    const [shareUrl, setShareUrl] = useState<string>('');

    // Create export data
    const createExportData = useCallback((): ShaderExportData => {
        const fragmentShaderCode = generateFragmentShaderCode(shaderType);

        const uniformsData = {
            u_time: { value: 0.0 },
            u_resolution: { value: [window.innerWidth, window.innerHeight] },
            u_mouse: { value: [0.5, 0.5] },
            u_speed: { value: shaderParams.speed },
            u_scale: { value: shaderParams.scale },
            u_octaves: { value: shaderParams.octaves },
            u_lacunarity: { value: shaderParams.lacunarity },
            u_persistence: { value: shaderParams.persistence },
            ...Object.fromEntries(
                Object.entries(shaderParams)
                    .filter(([_, value]) => value !== undefined)
                    .map(([key, value]) => [`u_${key}`, { value }])
            )
        };

        return {
            name: exportName,
            description: exportDescription,
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            shaderType,
            speed: shaderParams.speed,
            scale: shaderParams.scale,
            isPlaying,
            octaves: shaderParams.octaves,
            lacunarity: shaderParams.lacunarity,
            persistence: shaderParams.persistence,
            shaderParams: {
                flowStrength: shaderParams.flowStrength,
                turbulence: shaderParams.turbulence,
                plasmaIntensity: shaderParams.plasmaIntensity,
                viscosity: shaderParams.viscosity,
                pressure: shaderParams.pressure,
                particleCount: shaderParams.particleCount,
                particleSize: shaderParams.particleSize,
                segments: shaderParams.segments,
                rotation: shaderParams.rotation,
            },
            gradient: gradientConfig,
            generatedCode: {
                fragmentShader: fragmentShaderCode,
                uniforms: uniformsData,
                htmlSetup: '',  // Will be generated on demand
                jsSetup: ''     // Will be generated on demand
            }
        };
    }, [exportName, exportDescription, shaderType, gradientConfig, shaderParams, isPlaying]);

    // Handle downloads
    const handleDownload = useCallback((format: 'json' | 'js' | 'html') => {
        const data = createExportData();
        downloadExport(data, { format, includeCode: true });
    }, [createExportData]);

    // Handle copy to clipboard
    const handleCopy = useCallback(async (format: 'json' | 'js') => {
        const data = createExportData();
        const success = await copyToClipboard(data, format);
        if (success) {
            setCopied(format);
            setTimeout(() => setCopied(null), 2000);
        }
    }, [createExportData]);

    // Generate share URL
    const handleGenerateShareUrl = useCallback(() => {
        const data = createExportData();
        const url = generateShareableURL(data);
        setShareUrl(url);
        navigator.clipboard.writeText(url);
        setCopied('share');
        setTimeout(() => setCopied(null), 2000);
    }, [createExportData]);

    // Get shader description
    const getShaderDescription = (type: ShaderType): string => {
        const descriptions = {
            classic: 'Smooth layered noise gradients with organic flow',
            vector: 'Curl noise vector fields creating fluid motion',
            turbulence: 'Chaotic domain warping with high-frequency details',
            plasma: 'Energetic sine wave interference patterns',
            fluid: 'Real-time fluid simulation with viscosity controls',
            particle: 'Dynamic particle system with gradient-based colors',
            kaleidoscope: 'Symmetrical patterns with mirror reflections'
        };
        return descriptions[type] || 'Custom shader effect';
    };

    const exportData = createExportData();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Export Shader Configuration
                    </DialogTitle>
                    <DialogDescription>
                        Export your current shader setup with all parameters, gradient configuration, and generated code.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Export Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="export-name">Export Name</Label>
                            <Input
                                id="export-name"
                                value={exportName}
                                onChange={(e) => setExportName(e.target.value)}
                                placeholder="My awesome shader"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="export-description">Description</Label>
                            <Input
                                id="export-description"
                                value={exportDescription}
                                onChange={(e) => setExportDescription(e.target.value)}
                                placeholder="Generated from Vector Field Studio"
                            />
                        </div>
                    </div>

                    {/* Current Configuration Summary */}
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                        <h4 className="font-semibold flex items-center gap-2">
                            <Code2 className="w-4 h-4" />
                            Current Configuration
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Shader Type:</span>
                                <Badge variant="secondary" className="ml-2">{shaderType}</Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Animation:</span>
                                <Badge variant={isPlaying ? "default" : "secondary"} className="ml-2">
                                    {isPlaying ? "Playing" : "Paused"}
                                </Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Gradient Stops:</span>
                                <Badge variant="outline" className="ml-2">{gradientConfig.stops.length}</Badge>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Interpolation:</span>
                                <Badge variant="outline" className="ml-2">{gradientConfig.interpolation.toUpperCase()}</Badge>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {getShaderDescription(shaderType)}
                        </p>
                    </div>

                    <Tabs defaultValue="download" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="download">Download</TabsTrigger>
                            <TabsTrigger value="copy">Copy</TabsTrigger>
                            <TabsTrigger value="share">Share</TabsTrigger>
                            <TabsTrigger value="preview">Preview</TabsTrigger>
                        </TabsList>

                        <TabsContent value="download" className="space-y-4">
                            <h4 className="font-medium">Download Files</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* HTML Export - Primary Option */}
                                <Button
                                    onClick={() => handleDownload('html')}
                                    className="flex items-center gap-2 h-auto p-4 flex-col bg-primary text-primary-foreground hover:bg-primary/90"
                                >
                                    <Globe className="w-6 h-6" />
                                    <div className="text-center">
                                        <div className="font-medium">Complete HTML</div>
                                        <div className="text-xs opacity-90">
                                            Standalone shader viewer
                                        </div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleDownload('json')}
                                    className="flex items-center gap-2 h-auto p-4 flex-col"
                                >
                                    <FileJson className="w-6 h-6" />
                                    <div className="text-center">
                                        <div className="font-medium">JSON Config</div>
                                        <div className="text-xs text-muted-foreground">
                                            Configuration data only
                                        </div>
                                    </div>
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => handleDownload('js')}
                                    className="flex items-center gap-2 h-auto p-4 flex-col"
                                >
                                    <FileCode className="w-6 h-6" />
                                    <div className="text-center">
                                        <div className="font-medium">JavaScript</div>
                                        <div className="text-xs text-muted-foreground">
                                            Three.js setup code
                                        </div>
                                    </div>
                                </Button>
                            </div>

                            {/* Quick Export Button */}
                            <div className="pt-2 border-t">
                                <Button
                                    onClick={() => handleDownload('html')}
                                    className="w-full flex items-center gap-2"
                                    size="lg"
                                >
                                    <Download className="w-5 h-5" />
                                    Quick Export as HTML
                                </Button>
                                <p className="text-xs text-muted-foreground mt-2 text-center">
                                    Downloads a complete HTML file with your exact shader configuration
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="copy" className="space-y-4">
                            <h4 className="font-medium">Copy to Clipboard</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => handleCopy('json')}
                                    className="flex items-center gap-2 justify-start"
                                >
                                    {copied === 'json' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    Copy JSON Configuration
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => handleCopy('js')}
                                    className="flex items-center gap-2 justify-start"
                                >
                                    {copied === 'js' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    Copy JavaScript Code
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="share" className="space-y-4">
                            <h4 className="font-medium">Share Configuration</h4>
                            <div className="space-y-3">
                                <Button
                                    onClick={handleGenerateShareUrl}
                                    className="flex items-center gap-2"
                                >
                                    {copied === 'share' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                    Generate Shareable URL
                                </Button>
                                {shareUrl && (
                                    <div className="p-3 bg-muted rounded-lg">
                                        <Label className="text-sm font-medium">Shareable URL</Label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Input
                                                value={shareUrl}
                                                readOnly
                                                className="font-mono text-xs"
                                            />
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(shareUrl, '_blank')}
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="space-y-4">
                            <h4 className="font-medium">Configuration Preview</h4>
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-sm font-medium">Shader Parameters</Label>
                                    <div className="p-3 bg-muted rounded-lg mt-1">
                                        <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify({
                                                type: exportData.shaderType,
                                                speed: exportData.speed,
                                                scale: exportData.scale,
                                                ...exportData.shaderParams
                                            }, null, 2)}
                                        </pre>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-sm font-medium">Gradient Configuration</Label>
                                    <div className="p-3 bg-muted rounded-lg mt-1">
                                        <pre className="text-xs overflow-x-auto">
                                            {JSON.stringify(exportData.gradient, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <Separator />

                    <div className="text-xs text-muted-foreground space-y-2">
                        <p>
                            <strong>Note:</strong> The exported files contain the configuration and setup code.
                            For the complete shader implementation, refer to the fragmentShaders.ts file in the source code.
                        </p>
                        <p>
                            <strong>Usage:</strong> Import the JSON configuration or use the JavaScript setup code
                            with Three.js to recreate this exact shader effect in your projects.
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
