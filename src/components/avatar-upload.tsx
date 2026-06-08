import { useEffect, useState, useRef } from "react";
import { Camera, Loader2, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  userId: string;
  avatarPath?: string | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onUploaded?: (path: string) => void;
}

const SIZES = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export function AvatarUpload({ userId, avatarPath, size = "lg", editable = true, onUploaded }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!avatarPath) { setUrl(null); return; }
    supabase.storage.from("avatars").createSignedUrl(avatarPath, 3600).then(({ data }) => {
      if (!cancelled) setUrl(data?.signedUrl ?? null);
    });
    return () => { cancelled = true; };
  }, [avatarPath]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Image only"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: path }).eq("id", userId);
      if (updErr) throw updErr;
      toast.success("Profile picture updated");
      onUploaded?.(path);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative inline-block">
      <div className={`${SIZES[size]} rounded-full bg-gradient-gold flex items-center justify-center shadow-glow overflow-hidden`}>
        {url ? (
          <img src={url} alt="avatar" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className={size === "lg" ? "h-10 w-10 text-primary-foreground" : "h-5 w-5 text-primary-foreground"} />
        )}
      </div>
      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition disabled:opacity-50"
            aria-label="Change profile picture"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}
