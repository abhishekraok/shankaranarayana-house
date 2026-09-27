"""Synthesize subtle wind and footsteps locally; no downloaded or private media.

    python unreal/scripts/make_audio.py
Outputs go to the ignored generated project's Saved/WalkAudio folder.
"""
from pathlib import Path
import array
import math
import random
import wave

OUT = Path(__file__).resolve().parents[1] / 'Shankaranarayana/Saved/WalkAudio'
RATE = 24000

def write(name, samples):
    with wave.open(str(OUT / (name + '.wav')), 'wb') as f:
        f.setnchannels(1)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes(array.array('h', [int(max(-1, min(1, s))*32767) for s in samples]).tobytes())

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rng = random.Random(2013)
    low = 0
    samples = []
    for i in range(RATE*24):
        t = i/RATE
        low = .975*low + .025*rng.uniform(-1,1)
        envelope = .55 + .18*math.sin(2*math.pi*t/8) + .12*math.sin(2*math.pi*t/12)
        samples.append(low*.65*envelope)
    # Crossfade one second to avoid a click at the looping seam.
    for i in range(RATE):
        a = i/RATE
        samples[i] = samples[-RATE+i]*(1-a) + samples[i]*a
    write('Ambience', samples[:-RATE])
    samples=[]
    for i in range(int(RATE*.19)):
        t=i/RATE
        envelope=(1-math.exp(-t*600))*math.exp(-t*32)
        samples.append(envelope*(.20*math.sin(2*math.pi*110*t)+.10*rng.uniform(-1,1)))
    write('Footstep', samples)
    print('Generated original wind and footstep audio:', OUT)

if __name__ == '__main__':
    main()
