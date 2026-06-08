import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export function LeaveReviewDialog({
  open, onOpenChange, orderId, reviewerId, reviewedUserId, reviewedUserName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderId: string;
  reviewerId: string;
  reviewedUserId: string;
  reviewedUserName?: string;
}) {
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (rating < 1 || rating > 5) return toast.error("Please pick a rating");
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      reviewer_id: reviewerId,
      reviewed_user_id: reviewedUserId,
      order_id: orderId,
      rating,
      comment: comment.trim().slice(0, 1000) || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Thanks for your review!");
    qc.invalidateQueries({ queryKey: ["my-reviews"] });
    qc.invalidateQueries({ queryKey: ["product-reviews"] });
    qc.invalidateQueries({ queryKey: ["seller-rating"] });
    onOpenChange(false);
    setComment(""); setRating(5);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rate {reviewedUserName ?? "the other party"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="p-1"
              >
                <Star className={`h-9 w-9 transition-colors ${(hover || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground/40"}`} />
              </button>
            ))}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Share details about your experience (optional)"
          />
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={saving} className="bg-gradient-gold text-primary-foreground font-semibold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
