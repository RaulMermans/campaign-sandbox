"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type MessyBriefInputProps = {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onUseSample: () => void;
  isRunning?: boolean;
};

export function MessyBriefInput({ value, onChange, onRun, onUseSample, isRunning }: MessyBriefInputProps) {
  return (
    <section className="grid gap-4">
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a messy campaign brief here..."
        aria-label="Messy campaign brief"
      />
      <div className="flex flex-wrap gap-3">
        <Button onClick={onRun} disabled={isRunning || value.trim().length < 20}>
          {isRunning ? "Running simulation" : "Run simulation"}
        </Button>
        <Button
          type="button"
          onClick={onUseSample}
          className="border-stone-300 bg-white text-stone-950 hover:bg-stone-100"
        >
          Use NODO sample
        </Button>
      </div>
    </section>
  );
}
