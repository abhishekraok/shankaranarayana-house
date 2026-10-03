# Water volume: measured trials

Uniform water darkening fails the close/distant view tradeoff. Production settings
remain unchanged. All comparisons use three matched poses and shader time 2 seconds.

| Trial | Distant water RGB | Close water RGB |
|---|---|---|
| Photograph | 85/132/84 | 104/145/97 |
| Current | 82/123/78 | 150/187/138 |
| Opacity .30 | 97/150/94 | 160/201/150 |
| Opacity 0 | 65/84/61 | 137/161/123 |
| Scattering ×.75 | 76/117/74 | 143/182/132 |
| Scattering ×.75, phase −.25 | 78/119/75 | 143/182/132 |
| Above, opacity 0 | 60/76/56 | 128/149/114 |

[Opacity comparison](D:/repos/shankaranarayana-photoreal/checks/fidelity-20261002/water-opacity-review.jpg)
· [Volume comparison](D:/repos/shankaranarayana-photoreal/checks/fidelity-20261002/water-volume-review.jpg)
· [Angular scattering comparison](D:/repos/shankaranarayana-photoreal/checks/fidelity-20261002/water-phase-review.jpg).
These are corresponding material patches, not whole-image reconstruction scores.

UE coefficients are per centimetre: current extinction lengths are only 2.7–4 cm.
Stronger absorption had already failed. Opacity adds lit surface diffuse response;
increasing it makes this lake brighter. Neutral scattering reduction helps little,
and phase changes barely recover distant brightness. The pure-volume combination
darkens the distant lake conspicuously. An independent reviewer rejected adoption.

The repeated control and all listed candidates exit cleanly. The original control
and extra opacity .50 trial captured all images but crashed during editor shutdown;
they remain explicitly flagged. Diagnostic changes are unsaved and record parameter
readbacks; audits reject persisted diagnostic time/phase nodes. Generated images stay ignored.
