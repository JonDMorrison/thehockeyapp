import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ColorPickerPopoverProps {
  label: string;
  value: string; // HSL format: "h s% l%"
  onChange: (value: string) => void;
}

// Parse HSL string "h s% l%" or "h s l" into components
const parseHSL = (hsl: string): { h: number; s: number; l: number } => {
  const parts = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  return {
    h: parts[0] || 0,
    s: parts[1] || 50,
    l: parts[2] || 50,
  };
};

// Format HSL components to string "h s% l%"
const formatHSL = (h: number, s: number, l: number): string => {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
};

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  label,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const parsed = parseHSL(value);
  const [hue, setHue] = useState(parsed.h);
  const [saturation, setSaturation] = useState(parsed.s);
  const [lightness, setLightness] = useState(parsed.l);

  // Sync with external value
  useEffect(() => {
    const p = parseHSL(value);
    setHue(p.h);
    setSaturation(p.s);
    setLightness(p.l);
  }, [value]);

  const handleChange = (h: number, s: number, l: number) => {
    setHue(h);
    setSaturation(s);
    setLightness(l);
    onChange(formatHSL(h, s, l));
  };

  const currentColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 h-10 px-3"
          type="button"
        >
          <div
            className="w-5 h-5 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: currentColor }}
          />
          <span className="text-sm">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-4" align="start">
        <div className="text-sm font-medium">{label}</div>

        {/* Color preview */}
        <div
          className="w-full h-12 rounded-lg border shadow-inner"
          style={{ backgroundColor: currentColor }}
        />

        {/* Hue slider */}
        <div className="space-y-2">
          <Label className="text-xs text-text-muted">{t("teams.colorPicker.hue")}</Label>
          <div
            className="h-3 rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(0, ${saturation}%, ${lightness}%),
                hsl(60, ${saturation}%, ${lightness}%),
                hsl(120, ${saturation}%, ${lightness}%),
                hsl(180, ${saturation}%, ${lightness}%),
                hsl(240, ${saturation}%, ${lightness}%),
                hsl(300, ${saturation}%, ${lightness}%),
                hsl(360, ${saturation}%, ${lightness}%)
              )`,
            }}
          />
          <Slider
            value={[hue]}
            onValueChange={([v]) => handleChange(v, saturation, lightness)}
            max={360}
            step={1}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-300"
          />
        </div>

        {/* Saturation slider */}
        <div className="space-y-2">
          <Label className="text-xs text-text-muted">{t("teams.colorPicker.saturation")}</Label>
          <div
            className="h-3 rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(${hue}, 0%, ${lightness}%),
                hsl(${hue}, 100%, ${lightness}%)
              )`,
            }}
          />
          <Slider
            value={[saturation]}
            onValueChange={([v]) => handleChange(hue, v, lightness)}
            max={100}
            step={1}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-300"
          />
        </div>

        {/* Lightness slider */}
        <div className="space-y-2">
          <Label className="text-xs text-text-muted">{t("teams.colorPicker.lightness")}</Label>
          <div
            className="h-3 rounded-full"
            style={{
              background: `linear-gradient(to right,
                hsl(${hue}, ${saturation}%, 0%),
                hsl(${hue}, ${saturation}%, 50%),
                hsl(${hue}, ${saturation}%, 100%)
              )`,
            }}
          />
          <Slider
            value={[lightness]}
            onValueChange={([v]) => handleChange(hue, saturation, v)}
            max={100}
            step={1}
            className="[&_[role=slider]]:bg-white [&_[role=slider]]:border-2 [&_[role=slider]]:border-gray-300"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
