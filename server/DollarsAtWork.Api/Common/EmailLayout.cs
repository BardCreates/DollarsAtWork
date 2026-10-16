using System.Net;
using System.Text;

namespace DollarsAtWork.Api.Common;

/// <summary>An email ready to send: the same message as plain text and as branded HTML.</summary>
public record EmailMessage(string Subject, string Text, string Html);

/// <summary>
/// Builds every app email in the Dollars at Work look: dark card, mascot and wordmark, one green button,
/// and a footer. Each piece is written to the plain-text and the HTML version at the same time, so the two can't
/// drift apart. Everything passed in is HTML-encoded here; callers never write markup.
/// Email clients only understand old-fashioned HTML: tables, inline styles, no web fonts, no CSS variables.
/// Colors match client/src/theme.ts.
/// </summary>
public sealed class EmailLayout(string appUrl)
{
    public const string SupportAddress = "dollarsatworkapp@gmail.com";

    // From theme.ts (brand + palette.text).
    private const string Page = "#181a20";
    private const string Card = "#23272f";
    private const string Inset = "#1c1f25";
    private const string Line = "#33383f";
    private const string Ink = "#e3e6eb";
    private const string Muted = "#b0b8c1";
    private const string Green = "#19c37d";
    private const string GreenInk = "#0b1410";
    private const string Yellow = "#f5c518";
    private const string Red = "#ff5c5c";
    private const string Font = "Inter, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    private const string WordmarkFont = "Coiny, 'Trebuchet MS', 'Arial Rounded MT Bold', Arial, sans-serif";

    private readonly string _appUrl = appUrl.TrimEnd('/');
    private readonly StringBuilder _text = new();
    private readonly StringBuilder _html = new();
    private string _preheader = "";
    private string _footerNote = "";

    private static string E(string value) => WebUtility.HtmlEncode(value);

    /// <summary>The short line inboxes show after the subject.</summary>
    public EmailLayout Preheader(string text) { _preheader = text; return this; }

    public EmailLayout Heading(string text)
    {
        _text.AppendLine(text).AppendLine(new string('=', Math.Min(text.Length, 60))).AppendLine();
        _html.Append($"<h1 style=\"margin:0 0 16px;font-family:{Font};font-size:24px;line-height:1.3;font-weight:700;color:{Ink};\">{E(text)}</h1>");
        return this;
    }

    public EmailLayout Paragraph(string text)
    {
        _text.AppendLine(text).AppendLine();
        _html.Append($"<p style=\"margin:0 0 16px;font-family:{Font};font-size:16px;line-height:1.6;color:{Ink};\">{E(text)}</p>");
        return this;
    }

    /// <summary>The one call to action. The plain-text version shows the link on its own line.</summary>
    public EmailLayout Button(string label, string url)
    {
        _text.AppendLine($"{label}:").AppendLine(url).AppendLine();
        _html.Append(
            "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:8px 0 24px;\"><tr>" +
            $"<td align=\"center\" bgcolor=\"{Green}\" style=\"border-radius:10px;background:{Green};\">" +
            $"<a href=\"{E(url)}\" target=\"_blank\" style=\"display:inline-block;padding:14px 28px;font-family:{Font};font-size:16px;font-weight:700;line-height:1;color:{GreenInk};text-decoration:none;border-radius:10px;\">{E(label)}</a>" +
            "</td></tr></table>" +
            $"<p style=\"margin:0 0 20px;font-family:{Font};font-size:13px;line-height:1.5;color:{Muted};\">Button not working? Copy this link into your browser:<br>" +
            $"<a href=\"{E(url)}\" style=\"color:{Green};word-break:break-all;\">{E(url)}</a></p>");
        return this;
    }

    /// <summary>A large highlighted figure, e.g. net worth, with an optional line under it.</summary>
    public EmailLayout Figure(string label, string value, string? caption = null)
    {
        _text.AppendLine($"{label}: {value}");
        if (caption is not null) _text.AppendLine(caption);
        _text.AppendLine();
        _html.Append(
            $"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 20px;\"><tr>" +
            $"<td bgcolor=\"{Inset}\" style=\"background:{Inset};border-radius:12px;border-left:4px solid {Green};padding:18px 20px;\">" +
            $"<div style=\"font-family:{Font};font-size:13px;line-height:1.4;color:{Muted};text-transform:uppercase;letter-spacing:0.6px;\">{E(label)}</div>" +
            $"<div style=\"font-family:{Font};font-size:32px;line-height:1.25;font-weight:700;color:{Green};padding-top:4px;\">{E(value)}</div>" +
            (caption is null ? "" : $"<div style=\"font-family:{Font};font-size:14px;line-height:1.5;color:{Ink};padding-top:6px;\">{E(caption)}</div>") +
            "</td></tr></table>");
        return this;
    }

    public enum Tone { Plain, Good, Bad }

    public record Row(string Label, string Value, string? Note = null, Tone NoteTone = Tone.Plain);

    /// <summary>A titled list of label / value rows, e.g. "Savings  $4,200  (up $300)".</summary>
    public EmailLayout Rows(string title, IReadOnlyList<Row> rows)
    {
        if (rows.Count == 0) return this;
        _text.AppendLine(title);
        foreach (var row in rows)
            _text.AppendLine($"  {row.Label}: {row.Value}{(row.Note is null ? "" : $" ({row.Note})")}");
        _text.AppendLine();

        _html.Append($"<p style=\"margin:4px 0 8px;font-family:{Font};font-size:13px;font-weight:700;line-height:1.4;color:{Yellow};text-transform:uppercase;letter-spacing:0.6px;\">{E(title)}</p>");
        _html.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:0 0 20px;\">");
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var border = i < rows.Count - 1 ? $"border-bottom:1px solid {Line};" : "";
            var noteColor = row.NoteTone switch { Tone.Good => Green, Tone.Bad => Red, _ => Muted };
            _html.Append(
                "<tr>" +
                $"<td style=\"{border}padding:10px 0;font-family:{Font};font-size:15px;line-height:1.4;color:{Muted};\">{E(row.Label)}</td>" +
                $"<td align=\"right\" style=\"{border}padding:10px 0;font-family:{Font};font-size:15px;line-height:1.4;text-align:right;\">" +
                $"<span style=\"font-weight:700;color:{Ink};\">{E(row.Value)}</span>" +
                (row.Note is null ? "" : $"<br><span style=\"font-size:13px;color:{noteColor};\">{E(row.Note)}</span>") +
                "</td></tr>");
        }
        _html.Append("</table>");
        return this;
    }

    /// <summary>Small print inside the card: link lifetimes, "if this wasn't you", disclaimers.</summary>
    public EmailLayout Small(string text)
    {
        _text.AppendLine(text).AppendLine();
        _html.Append($"<p style=\"margin:0 0 12px;font-family:{Font};font-size:13px;line-height:1.5;color:{Muted};\">{E(text)}</p>");
        return this;
    }

    /// <summary>Why this person is getting the email, shown in the footer.</summary>
    public EmailLayout FooterNote(string text) { _footerNote = text; return this; }

    public EmailMessage Build(string subject)
    {
        var text = new StringBuilder();
        text.AppendLine("DOLLARS AT WORK").AppendLine();
        text.Append(_text);
        text.AppendLine("--");
        text.AppendLine("Dollars at Work: put every dollar to work. Private by design, no bank login.");
        text.AppendLine($"Questions? Write to {SupportAddress}.");
        if (_footerNote.Length > 0) text.AppendLine(_footerNote);
        text.AppendLine(_appUrl);

        var mascot = $"{_appUrl}/email/mascot.png";
        var html = new StringBuilder();
        html.Append("<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">");
        html.Append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">");
        html.Append("<meta name=\"color-scheme\" content=\"dark light\"><meta name=\"supported-color-schemes\" content=\"dark light\">");
        html.Append($"<title>{E(subject)}</title></head>");
        html.Append($"<body style=\"margin:0;padding:0;background:{Page};\" bgcolor=\"{Page}\">");
        // Preheader: hidden in the message, shown in the inbox list.
        html.Append($"<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;color:{Page};font-size:1px;line-height:1px;\">{E(_preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>");
        html.Append($"<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" bgcolor=\"{Page}\" style=\"background:{Page};\"><tr><td align=\"center\" style=\"padding:32px 16px;\">");
        html.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"max-width:560px;\">");

        // Header: mascot + wordmark, linking home.
        html.Append(
            "<tr><td style=\"padding:0 4px 20px;\">" +
            $"<a href=\"{E(_appUrl)}\" target=\"_blank\" style=\"text-decoration:none;\">" +
            "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
            $"<td style=\"padding-right:12px;vertical-align:middle;\"><img src=\"{E(mascot)}\" width=\"48\" height=\"45\" alt=\"\" style=\"display:block;border:0;width:48px;height:auto;\"></td>" +
            $"<td style=\"vertical-align:middle;font-family:{WordmarkFont};font-size:24px;line-height:1.1;letter-spacing:1px;color:{Green};\">Dollars at Work</td>" +
            "</tr></table></a></td></tr>");

        // Card, with the hard-hat yellow stripe on top.
        html.Append(
            $"<tr><td bgcolor=\"{Card}\" style=\"background:{Card};border-radius:16px;overflow:hidden;\">" +
            "<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">" +
            $"<tr><td height=\"4\" bgcolor=\"{Yellow}\" style=\"height:4px;line-height:4px;font-size:0;background:{Yellow};border-radius:16px 16px 0 0;\">&nbsp;</td></tr>" +
            $"<tr><td style=\"padding:32px 32px 20px;\">{_html}</td></tr>" +
            "</table></td></tr>");

        // Footer.
        html.Append(
            $"<tr><td style=\"padding:24px 8px 0;font-family:{Font};font-size:12px;line-height:1.6;color:{Muted};text-align:center;\">" +
            $"<strong style=\"color:{Ink};\">Dollars at Work</strong> &middot; Private by design, no bank login.<br>" +
            $"Questions? Write to <a href=\"mailto:{SupportAddress}\" style=\"color:{Green};text-decoration:none;\">{SupportAddress}</a>." +
            (_footerNote.Length > 0 ? $"<br>{E(_footerNote)}" : "") +
            "</td></tr>");

        html.Append("</table></td></tr></table></body></html>");
        return new EmailMessage(subject, text.ToString(), html.ToString());
    }
}
