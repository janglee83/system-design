"use client";
import { Save, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { IconButton } from "@/ui/IconButton";
import { Select } from "@/ui/Select";
import { toast } from "@/ui/toast-store";
import { deletePreset, listPresets, putPreset } from "../designs/db";
import { applyPreset, BUILT_IN_PRESETS, presetWorkload, type Preset } from "../model/presets";
import { useDesignApi } from "../store/LabStores";

/** Built-in and saved traffic presets (R21). Without IndexedDB only the built-ins show. */
export function PresetPicker() {
  const t = useTranslations("presets");
  const tAll = useTranslations();
  const api = useDesignApi();
  /** null: storage unavailable. */
  const [user, setUser] = useState<Preset[] | null>([]);
  const [last, setLast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  const reload = useCallback(
    () =>
      listPresets().then(
        (ps) => setUser(ps.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))),
        () => setUser(null),
      ),
    [],
  );
  useEffect(() => {
    void reload();
  }, [reload]);

  const all = [...BUILT_IN_PRESETS, ...(user ?? [])];
  const nameOf = (p: Preset) => (p.nameKey ? tAll(p.nameKey) : (p.name ?? p.id));
  const lastUser = user?.find((p) => p.id === last);

  const choose = (id: string) => {
    const p = all.find((x) => x.id === id);
    if (!p) return;
    api.getState().apply((d) => applyPreset(d, p));
    setLast(id);
  };
  const save = async () => {
    const n = name.trim();
    if (!n) return;
    try {
      await putPreset({ id: crypto.randomUUID(), name: n, workload: presetWorkload(api.getState().design.workload) });
      setSaving(false);
      setName("");
      await reload();
    } catch {
      toast(t("unavailable"), "warn");
    }
  };
  const remove = async (p: Preset) => {
    try {
      await deletePreset(p.id);
      setLast(null);
      await reload();
    } catch {
      toast(t("unavailable"), "warn");
    }
  };

  return (
    <div className="flex items-center gap-1 py-1">
      <div className="min-w-0 flex-1">
        <Select<string>
          label={t("label")}
          value=""
          placeholder={t("choose")}
          onChange={choose}
          options={[
            ...BUILT_IN_PRESETS.map((p) => ({ value: p.id, label: nameOf(p), group: t("builtIn") })),
            ...(user ?? []).map((p) => ({ value: p.id, label: nameOf(p), group: t("yours") })),
          ]}
        />
      </div>
      <IconButton label={t("save")} onClick={() => setSaving(true)} className="size-7">
        <Save size={14} aria-hidden />
      </IconButton>
      {lastUser ? (
        <IconButton label={t("delete", { name: nameOf(lastUser) })} onClick={() => void remove(lastUser)} className="size-7">
          <Trash2 size={14} aria-hidden />
        </IconButton>
      ) : null}
      <Dialog
        open={saving}
        onOpenChange={setSaving}
        title={t("saveTitle")}
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaving(false)}>
              {tAll("common.cancel")}
            </Button>
            <Button variant="primary" type="submit" form="save-preset" disabled={name.trim() === ""}>
              {tAll("common.save")}
            </Button>
          </>
        }
      >
        <form
          id="save-preset"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <input
            type="text"
            autoFocus
            aria-label={t("name")}
            placeholder={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 w-full rounded-sm border border-border-strong bg-surface px-2 text-sm placeholder:text-text-3"
          />
        </form>
      </Dialog>
    </div>
  );
}
