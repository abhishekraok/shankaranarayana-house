// Unreal Custom node inputs: P (WorldPosition), T (Time), Mix (scalar default 0).
// World centimetres: smoothly advected height gradients. Both endpoints have
// RMS slope ~.01608; water color/volume/specular/roughness are unchanged.
float2 p=P.xy;
float a=dot(p,float2(.13,.07))+T*.7;
float b=dot(p,float2(-.11,.21))-T*.53;
float c=dot(p,float2(.29,-.17))+T*.91;
float2 oldSlope=float2(-.012*cos(a)+.008*cos(b)-.006*cos(c),
                       -.006*cos(a)-.015*cos(b)+.0035*cos(c));
// Keep the original arithmetic/normalization on the default path.
[branch] if (Mix<=0.0) return normalize(float3(oldSlope,1));

struct WaterAnalyticNoise {
    float hash(int2 p) {
        uint h=asuint(p.x)*0x8da6b343u ^ asuint(p.y)*0xd8163841u;
        h^=h>>16; h*=0x7feb352du; h^=h>>15; h*=0x846ca68bu; h^=h>>16;
        return float(h & 0x00ffffffu)/8388608.0-1.0;
    }
    float3 valueGradient(float2 p) {
        int2 i=int2(floor(p)); float2 f=frac(p);
        float2 u=f*f*f*(f*(f*6.0-15.0)+10.0);
        float2 du=30.0*f*f*(f-1.0)*(f-1.0);
        float a=hash(i), b=hash(i+int2(1,0)), c=hash(i+int2(0,1)), d=hash(i+int2(1,1));
        float k=b-a, l=c-a, m=a-b-c+d;
        return float3(a+k*u.x+l*u.y+m*u.x*u.y,
                      du.x*(k+m*u.y),du.y*(l+m*u.x));
    }
    float2 octaveGradient(float2 p,float T,float cell,float weight,float2 rotation,float2 velocity,float2 offset) {
        float2 v=p+T*velocity;
        float2 q=float2(rotation.x*v.x-rotation.y*v.y,rotation.y*v.x+rotation.x*v.y)/cell+offset;
        float2 g=valueGradient(q).yz;
        return weight/cell*float2(rotation.x*g.x+rotation.y*g.y,-rotation.y*g.x+rotation.x*g.y);
    }
};
WaterAnalyticNoise noise;
float2 gradient=float2(0,0);
gradient+=noise.octaveGradient(p,T,18.0,1.00,float2(0.9323273456,0.3616154320),float2(3.1,1.4),float2(17.31,-11.47));
gradient+=noise.octaveGradient(p,T,12.0,0.70,float2(0.8080275083,-0.5891447579),float2(-1.9,1.2),float2(-33.27,41.19));
gradient+=noise.octaveGradient(p,T,8.0,0.25,float2(0.4535961214,0.8912073601),float2(2.2,-1.0),float2(71.73,-53.11));
float2 irregularSlope=-0.1523587409*gradient;
float m=saturate(Mix);
// RMS-preserving blend for nearly uncorrelated fields; evaluate endpoints first.
float2 slope=lerp(oldSlope,irregularSlope,m)*rsqrt((1.0-m)*(1.0-m)+m*m);
return normalize(float3(slope,1));
