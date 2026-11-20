import assert from 'node:assert/strict'
import vm from 'node:vm'

import {
  deriveBroadcastRootUrl,
  normalizeBroadcastBaseUrl,
  resolveBroadcastUrl,
  sameUrlOrigin,
} from '../../src/broadcast-url.ts'
import { cloneProgramInfo, hasChangedPresentEvent } from '../../src/program-info.ts'
import {
  DEFAULT_RECEIVER_DEVICE_IDENTIFIER,
  getDefaultReceiverIrdId,
  resolveReceiverDeviceIdentifier,
} from '../../src/device-identifier.ts'

const programStart = new Date('2026-07-31T12:00:00Z')
const program = cloneProgramInfo({
  service_id: 101,
  event_id: 42,
  start_time: programStart,
  duration: 30 * 60 * 1000,
})
assert.notEqual(program.start_time, programStart)
assert.equal(program.start_time.getTime(), programStart.getTime())
const iframeDate = vm.runInNewContext('new Date("2026-07-31T12:00:00Z")')
assert.equal(cloneProgramInfo({ start_time: iframeDate }).start_time.getTime(), programStart.getTime())
const event = { original_network_id: 11, transport_stream_id: 45169, service_id: 171, event_id: 42 }
assert.equal(hasChangedPresentEvent(null, event), false)
assert.equal(hasChangedPresentEvent(event, { ...event, name: 'Updated title' }), false)
assert.equal(hasChangedPresentEvent(event, { ...event, f_event_id: 43 }), false)
assert.equal(hasChangedPresentEvent({ event_id: 42 }, event), false)
assert.equal(hasChangedPresentEvent(event, { ...event, event_id: 43 }), true)
assert.equal(hasChangedPresentEvent(event, { ...event, service_id: 172 }), true)
assert.equal(hasChangedPresentEvent(event, null), false)
assert.throws(() => cloneProgramInfo({ start_time: '2026-07-31T12:00:00Z' }), /valid Date/)
assert.throws(() => cloneProgramInfo({ duration: -1 }), /millisecond duration/)
assert.equal(await resolveReceiverDeviceIdentifier(0), DEFAULT_RECEIVER_DEVICE_IDENTIFIER)
assert.equal(await resolveReceiverDeviceIdentifier(7, kind => `receiver-${kind}`), 'receiver-7')
assert.equal(await resolveReceiverDeviceIdentifier(9, () => null), '')
assert.equal(getDefaultReceiverIrdId(5), DEFAULT_RECEIVER_DEVICE_IDENTIFIER)
assert.equal(getDefaultReceiverIrdId(4), null)
const origin = 'https://receiver.example/player/index.html'
const base = normalizeBroadcastBaseUrl(undefined, origin)
assert.equal(base.href, 'https://receiver.example/data-broadcast/')
const root = deriveBroadcastRootUrl(
  'https://receiver.example/data-broadcast/bsfuji4k/40/0000/html/index.html',
  base,
)
assert.equal(root.href, 'https://receiver.example/data-broadcast/bsfuji4k/')
assert.equal(
  resolveBroadcastUrl('/60/002/caption/source/index.html', base, root).pathname,
  '/data-broadcast/bsfuji4k/60/002/caption/source/index.html',
)
assert.equal(
  resolveBroadcastUrl('/bsfuji4k/60/001/top/index.html', base, root).pathname,
  '/data-broadcast/bsfuji4k/60/001/top/index.html',
)
assert.equal(
  resolveBroadcastUrl('/sh4/60/001/index.html?x=1#top', base).href,
  'https://receiver.example/data-broadcast/sh4/60/001/index.html?x=1#top',
)
assert.equal(
  resolveBroadcastUrl('/data-broadcast/sh4/index.html', base).pathname,
  '/data-broadcast/sh4/index.html',
)

// Custom transports are opt-in and remain isolated even when URL.origin is null.
const customDocument = 'kiririn-mmt://app/data-broadcast/sh4/40/001/startup/index.html'
assert.throws(() => normalizeBroadcastBaseUrl(undefined, customDocument), /HTTP/)
const customBase = normalizeBroadcastBaseUrl(undefined, customDocument, ['kiririn-mmt'])
assert.equal(customBase.href, 'kiririn-mmt://app/data-broadcast/')
const customRoot = deriveBroadcastRootUrl(customDocument, customBase)
assert.equal(customRoot.href, 'kiririn-mmt://app/data-broadcast/sh4/')
assert.equal(resolveBroadcastUrl('/60/002/caption/index.html', customBase, customRoot).href,
  'kiririn-mmt://app/data-broadcast/sh4/60/002/caption/index.html')
for (const foreign of ['kiririn-mmt://other/', 'other://app/', 'https://app/']) {
  assert.equal(resolveBroadcastUrl(foreign, customBase, customRoot).href, foreign)
  assert.equal(deriveBroadcastRootUrl(foreign, customBase).href, customBase.href)
}
for (const invalid of ['file:///tmp/', 'data:text/html,test', 'javascript:alert(1)', 'blob:null/test', 'kiririn-mmt:/no-host']) {
  assert.throws(() => normalizeBroadcastBaseUrl(invalid, customDocument, ['kiririn-mmt', 'file', 'data', 'javascript', 'blob']))
}

assert.equal(sameUrlOrigin('kiririn-mmt://app:100/a', 'kiririn-mmt://app:101/a'), false)
assert.equal(sameUrlOrigin('kiririn-mmt://app/a', 'other://app/a'), false)
assert.equal(sameUrlOrigin('data:text/html,a', 'data:text/html,b'), false)
assert.equal(sameUrlOrigin('https://receiver.example:443/a', 'https://receiver.example/b'), true)
