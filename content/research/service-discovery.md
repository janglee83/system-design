# Service discovery — research note

- Level: L3
- Feeds lessons: `l3-service-discovery` (new)
- Researched: 2026-10-19

## Key facts (in our words)

1. **Service discovery answers "where are the healthy instances of service X right now?"** In
   elastic fleets addresses change constantly, so hard-coded host lists fail. [1][2]
2. **Registry**: instances register (self-registration or by the platform) and are removed when
   health checks fail or leases expire. Consul, etcd, ZooKeeper and Eureka are common registries. [1][3][4]
3. **Client-side discovery**: the caller queries the registry and load-balances itself (Netflix
   Eureka + Ribbon). **Server-side discovery**: the caller hits a load balancer/router that consults
   the registry (Kubernetes Services, AWS ELB). [2][5][6]
4. **DNS-based discovery** (Kubernetes cluster DNS, Consul DNS) is simple but inherits DNS caching
   delays. [5][7]
5. **Service meshes** (Envoy with an xDS control plane) push endpoint lists to sidecar proxies, which
   also handle retries and timeouts. [8]
6. **Availability vs consistency of the registry**: Eureka chose to keep serving possibly stale
   registrations during partitions rather than drop everything. [3][10]

## Engine mapping

- Not modelled; reading+check. A future experiment (stale registry sends traffic to dead
  instances) would reuse gap `health-check-detection-delay`.

## Misconceptions

- "DNS changes instantly." [7]
- "The registry must be strongly consistent." Many choose availability. [3][10]

## Sources

Primary:
1. *Service discovery* — HashiCorp Consul docs —
   https://developer.hashicorp.com/consul/docs/concepts/service-discovery — accessed 2026-10-19.
2. *Pattern: Client-side service discovery* — Chris Richardson, microservices.io —
   https://microservices.io/patterns/client-side-discovery.html — accessed 2026-10-19.
3. *Eureka wiki* — Netflix, GitHub — https://github.com/Netflix/eureka/wiki — accessed 2026-10-19.
4. *ZooKeeper: Wait-free coordination for Internet-scale systems* — P. Hunt et al., USENIX ATC —
   https://www.usenix.org/legacy/event/usenix10/tech/full_papers/Hunt.pdf — 2010.
5. *Service* — Kubernetes docs — https://kubernetes.io/docs/concepts/services-networking/service/ —
   accessed 2026-10-19.
6. *Pattern: Server-side service discovery* — microservices.io —
   https://microservices.io/patterns/server-side-discovery.html — accessed 2026-10-19.
7. *DNS for Services and Pods* — Kubernetes docs —
   https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/ — accessed 2026-10-19.
8. *Service discovery* — Envoy proxy docs —
   https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery —
   accessed 2026-10-19.

Books:
9. [B4] *Understanding Distributed Systems* — part "Communication", chapter "Discovery".
10. [B26] *Building Microservices*, 2nd ed. — Newman — chapter on implementing communication /
    service discovery.
11. [B5] *Distributed Systems*, 4th ed. — van Steen, Tanenbaum — ch. 6 "Naming".

Repos:
12. [G13] mfornos/awesome-microservices — service discovery tools —
    https://github.com/mfornos/awesome-microservices.
13. [G3] karanpratapsingh/system-design — "Service Discovery" chapter —
    https://github.com/karanpratapsingh/system-design.
