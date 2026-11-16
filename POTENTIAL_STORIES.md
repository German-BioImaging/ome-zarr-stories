# Potential user stories

These are user stories that are probably missing from [`user-stories.tsv`](user-stories.tsv). They came from a gap pass on 2026-11-16, after the stories had been mined from ome/ngff issues and hackathons. The aim was to find needs that are common in practice but that nobody has filed yet. Each one needs metadata or a layout rule in the spec, not just tooling.

None of these is in the TSV yet. To promote one, give it the next `STORY-NNN` and assess it like the others.

**Suggested first picks:** 1, 4, 5, 7, 8 and 10. They come up often, and each needs only a modest spec addition.

## Data types and modalities

1. **Cell tracking and lineages.** Store tracks and division trees linked to label IDs over time (GEFF, TrackMate, ultrack). This is a very common output that has no home today.
2. **SMLM localizations.** Store single-molecule point lists with their localization precision, linked to the images rendered from them. This is related to STORY-088, but it comes from a different community with different needs.
3. **Skeletons and graphs.** Store neuron tracings and vessel networks in image space (neuroglancer skeletons, SWC).
4. **Spectral or hyperspectral axis.** Use a wavelength axis with nm units. The spec only lists units for `space` and `time` axes, so this falls between RFC-3 and ngff#593.
5. **True-colour RGB brightfield.** Mark three channels as R, G and B, so viewers show true colour without guessing. This is item C in ngff#580 and ties to STORY-094 (JPEG).
6. **Whole-slide associated images.** Keep the slide label, macro and thumbnail images with the slide. Pathology formats carry them, but bioformats2raw drops or hides them.

## Acquisition and data lifecycle

7. **Live and growing datasets.** (Partly covered by STORY-105, writing from acquisition software; the "still being written" signal is still open.) Append timepoints or tiles while acquiring. Readers should be able to tell that the data is still being written, and how far it has got.
8. **Not acquired vs zero.** Mark chunks or regions that were never imaged (sparse tiling, failed tiles), so they are not confused with real zeros or `fill_value`.
9. **Image extent changing over time.** Support a growing embryo or an adaptive field of view, where each timepoint has its own extent. This was the motivation behind ngff#264. Today it means separate images placed in a scene.
10. **Label pyramid downsampling.** Declare that label levels were made by nearest-neighbour or majority-vote downsampling, so tools do not average label IDs.

## Sharing and findability

11. **Single-file OME-Zarr.** (Now STORY-106.) Package a dataset as one zip (`.ozx`) for email, upload and desktop use (ngff#398).
12. **Fast detection.** (For single files, see STORY-110.) Tell from one small read that a store is OME-Zarr, and which version and parts it uses (ngff#228, ngff#644 zarr-conventions).
13. **Thumbnails for catalogues.** (Now STORY-115.) Include a small preview image for repository listings and galleries. This goes beyond the plate overview in STORY-087.
14. **Integrity and versioning.** (Versioning is now STORY-103; checksums are still open.) Provide checksums or a manifest, so archives can verify a copy and record edits to a published dataset.

## Medical and quantitative

15. **Medical image round-trip.** Convert NIfTI or DICOM to OME-Zarr and back without losing geometry (direction cosines, patient space) or intensity rescaling (e.g. Hounsfield units). STORY-061, 007 and 083 each cover part of this; the story is the round trip itself.
