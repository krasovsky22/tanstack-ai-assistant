const CSS = `
  .cw-button {
    position: fixed; bottom: 24px; right: 24px;
    width: 56px; height: 56px; border-radius: 50%;
    background: #2563eb; border: none; cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 24px;
  }
  .cw-button:hover { background: #1d4ed8; }
  .cw-panel {
    position: fixed; bottom: 96px; right: 24px;
    width: 360px; height: 520px; background: #fff;
    border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    display: flex; flex-direction: column; z-index: 9999;
    font-family: system-ui, sans-serif; overflow: hidden;
  }
  .cw-messages {
    flex: 1; overflow-y: auto; padding: 16px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .cw-msg { max-width: 80%; padding: 8px 12px; border-radius: 8px; font-size: 14px; line-height: 1.4; }
  .cw-msg-user { background: #2563eb; color: #fff; align-self: flex-end; }
  .cw-msg-assistant { background: #f3f4f6; color: #111; align-self: flex-start; }
  .cw-msg-error { background: #fee2e2; color: #991b1b; align-self: flex-start; }
  .cw-input-row { display: flex; padding: 12px; border-top: 1px solid #e5e7eb; gap: 8px; }
  .cw-input { flex: 1; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; }
  .cw-input:focus { border-color: #2563eb; }
  .cw-send { padding: 8px 16px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
  .cw-send:disabled { opacity: 0.5; cursor: not-allowed; }
  .cw-header { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 15px; display: flex; justify-content: space-between; align-items: center; }
  .cw-close { background: none; border: none; cursor: pointer; font-size: 18px; color: #6b7280; }
  .cw-close:hover { color: #111; }
`;

export function injectStyles(): void {
  if (document.getElementById('chat-widget-styles')) return;
  const style = document.createElement('style');
  style.id = 'chat-widget-styles';
  style.textContent = CSS;
  document.head.appendChild(style);
}
