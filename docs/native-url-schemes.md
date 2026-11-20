# Native URL schemes

A native receiver can serve its broadcast resources through a registered URL
scheme rather than a TCP listener. HTTP(S) remains the default. Opt in to the
host-owned scheme when installing the runtime:

```ts
installRuntime(window, {
  broadcastBaseUrl: 'kiririn-mmt://session/data-broadcast/',
  broadcastSchemes: ['kiririn-mmt'],
  allowExternalNetwork: false,
  mediaPlaneAdapter: nativeMediaPlaneAdapter,
})
```

`AribReceiverHost` accepts the same `broadcastSchemes` option. The base must
share the document's scheme, hostname and port. Opaque origins are never compared
by the string `null`. Reserved protocols such as file, data and javascript are
not broadcast transports. Application navigation permits the document's own
custom authority and retains its permission-boundary checks; opting in does not
permit navigation to another custom scheme or hostname.

The host must register the scheme with its WebView before creating it, serve all
broadcast-relative paths, validate the authority for every request, and retain
its network/permission policy. In WKURLSchemeHandler, return HTTPURLResponse
with a status code and Content-Type, even for a custom-scheme URL: a plain
URLResponse gives fetch/XHR status 0, which is not a successful response.ok.
After WebKit cancels a scheme task, do not invoke any callbacks on it.

External HTTP(S) remains disabled when allowExternalNetwork is false. This does
not disable the host-owned custom scheme. Service Worker storage is not required
for native delivery; supply a native resourceStore if carousel caching is needed.

The prepare script builds the SDK and declarations when installing a pinned Git
commit. Consumers should pin a commit from the fork rather than a moving branch.
