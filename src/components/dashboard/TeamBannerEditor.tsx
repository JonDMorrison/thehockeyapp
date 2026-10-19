import { useEffect, useState } from "react";
import { Camera, Loader2, Upload, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTeamBanner, defaultBanner, type BannerChoice } from "@/hooks/useTeamBanner";
import { toast } from "@/components/app/Toast";
import original from "@/assets/brand/coach-planning.jpg";
export function bannerImage(preset: string) {
 return preset === "original" ? original : `/images/team-banners/${preset === "equipment" ? "equipment" : "rink"}.png`;
}
export function TeamBannerEditor({ teamId, teamName }: { teamId: string; teamName: string }) {
 const banner = useTeamBanner(teamId);
 const [open,setOpen] = useState(false);
 const [busy,setBusy] = useState(false);
 return <>
  <Button variant="secondary" size="sm" onClick={()=>setOpen(true)} className="relative mt-5 min-h-11 gap-2 border border-white/20 bg-black/60 text-white opacity-100 transition-opacity hover:bg-black/80 sm:absolute sm:bottom-4 sm:right-4 sm:mt-0 sm:opacity-0 sm:group-hover/banner:opacity-100 sm:group-focus-within/banner:opacity-100"><Camera className="h-4 w-4"/>Change banner</Button>
  <Dialog open={open} onOpenChange={next=>{if(!busy)setOpen(next);}}>
   <DialogContent className="max-h-[92dvh] w-[calc(100vw_-_1.5rem)] min-w-0 max-w-2xl overflow-y-auto rounded-2xl p-5 sm:p-6">
    <DialogHeader><DialogTitle>Make it your team’s</DialogTitle><DialogDescription>Pick a hockey background or upload your own. Adjust the focus before saving.</DialogDescription></DialogHeader>
    {banner.isPending ? <p role="status">Loading your banner…</p> : banner.isError ? <div role="alert"><p>Your banner could not be loaded.</p><Button onClick={()=>void banner.refetch()}>Try again</Button></div> : open && <BannerForm key={teamId} initial={banner.data ?? {...defaultBanner,imageUrl:null}} teamName={teamName} onSave={async(choice,file)=>{setBusy(true);try{await banner.save(choice,file);setOpen(false);toast.success("Team banner updated");}finally{setBusy(false);}}} onCancel={()=>setOpen(false)}/>}
   </DialogContent>
  </Dialog>
 </>;
}
function BannerForm({initial,teamName,onSave,onCancel}:{initial:BannerChoice & {imageUrl:string|null};teamName:string;onSave:(choice:BannerChoice,file?:File)=>Promise<void>;onCancel:()=>void}) {
 const [choice,setChoice]=useState<BannerChoice>(initial);
 const [file,setFile]=useState<File>();
 const [localUrl,setLocalUrl]=useState<string>();
 const [error,setError]=useState<string>();
 const [saving,setSaving]=useState(false);
 const [mobile,setMobile]=useState(false);
 useEffect(()=>()=>{if(localUrl)URL.revokeObjectURL(localUrl);},[localUrl]);
 const image=choice.preset==='upload' ? localUrl ?? initial.imageUrl : bannerImage(choice.preset);
 async function selectFile(selected?:File) {
  if(!selected)return;
  setError(undefined);
  if(!['image/jpeg','image/png','image/webp'].includes(selected.type)||selected.size>5*1024*1024){setError('Choose a JPG, PNG or WebP image under 5 MB.');return;}
  const url=URL.createObjectURL(selected);
  try {const img=new Image();img.src=url;await img.decode();if(img.naturalWidth<320||img.naturalHeight<100)throw new Error('small');}
  catch {URL.revokeObjectURL(url);setError('Choose a readable image at least 320 × 100 pixels.');return;}
  setFile(selected);setLocalUrl(url);setChoice({...defaultBanner,preset:'upload'});
 }
 return <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError(undefined);try{await onSave(choice,file);}catch{setError('Your banner was not saved. Your current banner is unchanged. Try again.');}finally{setSaving(false);}}} className="min-w-0 space-y-5">
  <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live preview</span><div className="flex gap-1"><Button type="button" size="sm" variant={mobile?'ghost':'secondary'} aria-pressed={!mobile} onClick={()=>setMobile(false)}>Desktop</Button><Button type="button" size="sm" variant={mobile?'secondary':'ghost'} aria-pressed={mobile} onClick={()=>setMobile(true)}>Phone</Button></div></div>
  <div className={`relative mx-auto w-full overflow-hidden rounded-xl border bg-black ${mobile?'max-w-[280px] aspect-[1.8/1]':'aspect-[7/1] min-h-24'}`} data-testid="banner-preview">
   {image&&<img src={image} alt="Banner preview" className="absolute inset-0 h-full w-full object-cover" style={{objectPosition:`${choice.focal_x}% ${choice.focal_y}%`}}/>}
   <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/10"/><p className="relative max-w-[80%] p-4 font-display text-lg font-black uppercase leading-tight text-white">{teamName}</p>
  </div>
  <fieldset disabled={saving} className="min-w-0 space-y-4">
   <legend className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary"/>Choose a background</legend>
   <div className="grid grid-cols-2 gap-3">{[{id:'rink',name:'Fresh ice'},{id:'equipment',name:'Ready to play'}].map(item=><button key={item.id} type="button" aria-pressed={choice.preset===item.id} onClick={()=>{setChoice({...defaultBanner,preset:item.id});setFile(undefined);setLocalUrl(undefined);}} className={`overflow-hidden rounded-xl border-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${choice.preset===item.id?'border-primary':'border-border'}`}><img src={bannerImage(item.id)} alt="" className="aspect-[2/1] w-full object-cover"/><span className="block px-3 py-2 text-sm font-medium">{item.name}</span><span className="block px-3 pb-2 text-xs text-muted-foreground">AI-created background</span></button>)}</div>
   <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-3 focus-within:ring-2 focus-within:ring-primary"><Upload className="h-5 w-5 shrink-0 text-primary"/><span className="min-w-0 text-sm"><span className="block font-semibold">Upload your photo</span><span className="block text-xs text-muted-foreground">JPG, PNG or WebP · up to 5 MB</span></span><input aria-label="Upload banner image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{void selectFile(e.target.files?.[0]);e.target.value='';}}/></label>
   <p className="text-xs text-muted-foreground">Use a photo you have permission to share with your team staff. Wide photos work best.</p>
   <div className="space-y-3">{[{key:'focal_x' as const,label:'Horizontal focus'},{key:'focal_y' as const,label:'Vertical focus'}].map(axis=><label key={axis.key} className="block text-sm"><span className="flex justify-between">{axis.label}<span className="tabular-nums text-muted-foreground">{choice[axis.key]}%</span></span><input type="range" min="0" max="100" step="1" aria-label={axis.label} value={choice[axis.key]} onChange={e=>setChoice({...choice,[axis.key]:Number(e.target.value)})} className="mt-1 h-9 w-full accent-primary"/></label>)}</div>
  </fieldset>
  {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button><Button type="submit" disabled={saving||!image} className="min-h-11">{saving&&<Loader2 className="mr-2 h-4 w-4 animate-spin"/>}{saving?'Saving…':'Save banner'}</Button></div>
 </form>;
}
