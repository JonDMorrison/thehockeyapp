// Conservative table layout and inline styles: content remains usable when images or CSS are blocked.
export const EMAIL_INK = "#18232e";
export const EMAIL_RED = "#ad444b";
export function emailEscape(value: unknown): string {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}
export function emailFrame(content: string, title: string, options: {photo?: "rink" | "driveway"; eyebrow?: string; preview?: string} = {}): string {
 const photo = options.photo;
 return `<!DOCTYPE html><html lang="en" dir="ltr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${emailEscape(title)}</title><style>@media only screen and (max-width:480px){.email-pad{padding:24px 20px!important}.email-title{font-size:28px!important}.email-button{display:block!important;text-align:center!important}.email-outer{padding:16px 8px!important}}a{overflow-wrap:anywhere}td{word-break:normal;overflow-wrap:anywhere}</style></head>
 <body style="margin:0;padding:0;background-color:#edf0f2;font-family:Arial,Helvetica,sans-serif;color:${EMAIL_INK};"><div lang="en" dir="ltr"><div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${emailEscape(options.preview ?? title)}</div>
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="email-outer" align="center" style="padding:32px 12px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #dce1e5;border-radius:20px;overflow:hidden;">
 <tr><td style="padding:22px 28px;background-color:#14212a;color:#ffffff;"><table role="presentation" width="100%"><tr><td style="font-size:17px;font-weight:bold;letter-spacing:.6px;">THE HOCKEY APP</td><td align="right" style="font-size:11px;color:#e4b9bc;letter-spacing:1px;">SMALL EFFORTS.<br>BIG POSSIBILITIES.</td></tr></table></td></tr>
 ${photo ? `<tr><td style="background-color:#e5e9eb;"><img src="https://www.hockeyapp.ca/images/email/${photo}.jpg" width="600" alt="${photo === "rink" ? "Hockey equipment ready beside the rink" : "A young hockey player practising shots in the driveway"}" style="width:100%;max-width:600px;height:auto;display:block;border:0;"></td></tr>` : ""}
 <tr><td class="email-pad" style="padding:32px 36px;"><p style="font-size:11px;font-weight:bold;letter-spacing:1.6px;text-transform:uppercase;color:${EMAIL_RED};margin:0 0 12px;">${emailEscape(options.eyebrow ?? "Your next shift starts here")}</p>${content}</td></tr>
 <tr><td style="padding:22px 28px;background-color:#f5f7f8;border-top:1px solid #e3e7ea;"><p style="font-size:14px;line-height:1.6;color:#52606b;margin:0;">A little work. A little fun. A stronger hockey habit.</p><p style="font-size:13px;line-height:1.6;color:#52606b;margin:8px 0 0;">Need a hand? <a href="mailto:jon@getclear.ca" style="color:#943a40;text-decoration:underline;">Reply to Jon</a> · The Hockey App</p></td></tr>
 </table></td></tr></table></div></body></html>`;
}
export function emailHeading(text: string): string {
 return `<h1 class="email-title" style="font-size:32px;line-height:1.15;letter-spacing:-.7px;color:${EMAIL_INK};margin:0 0 20px;">${text}</h1>`;
}
export function emailButton(label: string, href: string): string {
 return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td><a class="email-button" href="${emailEscape(href)}" style="display:inline-block;background-color:${EMAIL_RED};color:#ffffff;font-size:16px;line-height:24px;font-weight:bold;padding:14px 24px;border-radius:12px;text-decoration:none;mso-padding-alt:14px 24px;">${label} &rarr;</a></td></tr></table>`;
}
export function emailStats(items: {label: string; value: string | number}[]): string {
 return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background-color:#f0f4f5;border-radius:14px;table-layout:fixed;"><tr>${items.map(item => `<td align="center" style="padding:18px 5px;"><p style="font-size:29px;font-weight:bold;color:${EMAIL_INK};margin:0 0 6px;">${emailEscape(item.value)}</p><p style="font-size:12px;line-height:1.4;color:#52606b;margin:0;">${emailEscape(item.label)}</p></td>`).join("")}</tr></table>`;
}
export function emailPlainText(html: string): string {
 return html.replace(/<head>[\s\S]*?<\/head>/gi, "").replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)").replace(/<\/(?:p|h[1-6]|li|tr)>/gi, "\n\n").replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&rarr;/g, "→").split("\n").map(line => line.trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
