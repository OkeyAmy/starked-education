'use client';

import { ClipboardCopy, Link2, Radio, X } from 'lucide-react';

export function LabCollaborationPanel({
  collaboration,
  roomId,
  setRoomId
}: {
  collaboration: any;
  roomId: string;
  setRoomId: (value: string) => void;
}) {
  return (
    <div className="mt-4 space-y-4">
      <div className="rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">Room</p>
        <p className="mt-1 text-sm text-slate-600">Use a room id to sync state via BroadcastChannel (same browser) or WebRTC via manual offer/answer exchange.</p>

        <div className="mt-3 flex gap-2">
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            placeholder="room-id"
            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
          />
          <button
            onClick={() => {
              if (roomId.trim()) collaboration.connectBroadcast();
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Radio className="h-4 w-4" />
            Connect
          </button>
          <button
            onClick={() => collaboration.disconnectBroadcast()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" />
            Disconnect
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
            mode: <span className="font-semibold">{collaboration.mode}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-700">
            peers: <span className="font-semibold">{collaboration.peerCount}</span>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">WebRTC quick link</p>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(location.href);
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Link2 className="h-4 w-4" />
            Copy URL
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-600">For external peers, use Host/Join below and exchange offers via chat.</p>

        <div className="mt-3 grid gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => collaboration.host()}
              className="flex-1 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Host
            </button>
            <button
              onClick={() => collaboration.closePeer()}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
          </div>

          {collaboration.pendingOffer && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Offer</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(collaboration.pendingOffer)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                value={collaboration.pendingOffer}
                className="mt-2 min-h-[110px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs"
              />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Remote offer</p>
            <textarea
              value={collaboration.remoteOfferInput}
              onChange={(event) => collaboration.setRemoteOfferInput(event.target.value)}
              className="mt-2 min-h-[110px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs"
            />
            <button
              onClick={() => collaboration.join()}
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Join with offer
            </button>
          </div>

          {collaboration.pendingAnswer && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Answer</p>
                <button
                  onClick={() => navigator.clipboard?.writeText(collaboration.pendingAnswer)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                value={collaboration.pendingAnswer}
                className="mt-2 min-h-[110px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs"
              />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Remote answer (host)</p>
            <textarea
              value={collaboration.remoteAnswerInput}
              onChange={(event) => collaboration.setRemoteAnswerInput(event.target.value)}
              className="mt-2 min-h-[110px] w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-xs"
            />
            <button
              onClick={() => collaboration.acceptAnswer()}
              className="mt-2 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Accept answer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
