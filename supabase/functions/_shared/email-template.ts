export interface EmailTemplateOptions {
  preheader?: string;
  heading: string;
  headingColor?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  ctaColor?: string;
  footerExtra?: string;
}

const COLORS = {
  bodyBg: '#e8e6e0',
  headerBg: '#1a1917',
  headerBorder: '#353330',
  divider: '#d4a017',
  contentBg: '#faf9f7',
  contentText: '#2d2b29',
  contentMuted: '#6b6865',
  footerText: '#918e8a',
  footerLink: '#d4a017',
  defaultHeading: '#d4a017',
  buttonText: '#1a1917',
  buttonDefault: '#d4a017',
} as const;

function buildButton(ctaText: string, ctaUrl: string, ctaColor: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto;">
      <tr>
        <td align="center" bgcolor="${ctaColor}" style="border-radius: 24px; background-color: ${ctaColor};">
          <a
            href="${ctaUrl}"
            style="display: inline-block; padding: 14px 32px; font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 16px; font-weight: 700; color: ${COLORS.buttonText}; text-decoration: none; border-radius: 24px;"
          >
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `;
}

export function buildBrandedEmail(options: EmailTemplateOptions): string {
  const {
    preheader,
    heading,
    headingColor = COLORS.defaultHeading,
    body,
    ctaText,
    ctaUrl,
    ctaColor = COLORS.buttonDefault,
    footerExtra,
  } = options;

  const preheaderText = preheader ?? heading;
  const ctaMarkup = ctaText && ctaUrl ? buildButton(ctaText, ctaUrl, ctaColor) : '';
  const footerExtraMarkup = footerExtra
    ? `
      <tr>
        <td style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; line-height: 22px; color: ${COLORS.contentMuted};">
          ${footerExtra}
        </td>
      </tr>
    `
    : '';
  const ctaSpacerMarkup = ctaMarkup
    ? `
      <tr>
        <td height="32" style="font-size: 32px; line-height: 32px;">&nbsp;</td>
      </tr>
      <tr>
        <td align="center">
          ${ctaMarkup}
        </td>
      </tr>
    `
    : '';
  const footerExtraSpacerMarkup = footerExtra ? '<tr><td height="24" style="font-size: 24px; line-height: 24px;">&nbsp;</td></tr>' : '';

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${heading}</title>
  </head>
  <body bgcolor="${COLORS.bodyBg}" style="margin: 0; padding: 0; background-color: ${COLORS.bodyBg};">
    <span style="display:none;font-size:1px;color:${COLORS.contentBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
      ${preheaderText}
    </span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" bgcolor="${COLORS.bodyBg}" style="width: 100%; background-color: ${COLORS.bodyBg}; margin: 0; padding: 0;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <!--[if mso]>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600">
            <tr>
              <td>
          <![endif]-->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width: 100%; max-width: 600px;">
            <tr>
              <td bgcolor="${COLORS.headerBg}" style="background-color: ${COLORS.headerBg}; border: 1px solid ${COLORS.headerBorder}; border-bottom: 0; padding: 24px 32px 20px 32px;">
                <img
                  src="https://app.flowcred.ai/flowcred-logo.png"
                  alt="Flowcred AI"
                  height="40"
                  style="display: block; height: 40px; width: auto; border: 0;"
                />
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.divider}" height="3" style="background-color: ${COLORS.divider}; font-size: 3px; line-height: 3px;">&nbsp;</td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.contentBg}" style="background-color: ${COLORS.contentBg}; padding: 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; line-height: 34px; font-weight: 700; color: ${headingColor};">
                      ${heading}
                    </td>
                  </tr>
                  <tr>
                    <td height="24" style="font-size: 24px; line-height: 24px;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; line-height: 26px; color: ${COLORS.contentText};">
                      ${body}
                    </td>
                  </tr>
                  ${ctaSpacerMarkup}
                  ${footerExtraSpacerMarkup}
                  ${footerExtraMarkup}
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${COLORS.headerBg}" style="background-color: ${COLORS.headerBg}; border: 1px solid ${COLORS.headerBorder}; border-top: 0; padding: 24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td style="font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; line-height: 20px; color: ${COLORS.footerText};">
                      Powered by Flowcred AI
                      <span style="color: ${COLORS.footerText};">&nbsp;|&nbsp;</span>
                      <a href="https://flowcred.ai" style="color: ${COLORS.footerLink}; text-decoration: none;">flowcred.ai</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if mso]>
              </td>
            </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
