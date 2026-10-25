import ctypes as C,os,re,json
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
os.environ['EGL_PLATFORM']='surfaceless'
egl=C.CDLL('libEGL.so.1');I=C.c_int;U=C.c_uint;P=C.c_void_p;F=C.c_float
for name,restype,args in [('eglGetDisplay',P,[P]),('eglInitialize',U,[P,P,P]),('eglBindAPI',U,[U]),('eglChooseConfig',U,[P,P,P,I,P]),('eglCreatePbufferSurface',P,[P,P,P]),('eglCreateContext',P,[P,P,P,P]),('eglMakeCurrent',U,[P,P,P,P]),('eglGetProcAddress',P,[C.c_char_p])]:
 f=getattr(egl,name);f.restype=restype;f.argtypes=args
D=egl.eglGetDisplay(None);a=I();b=I();assert egl.eglInitialize(D,C.byref(a),C.byref(b));assert egl.eglBindAPI(0x30A0)
attrs=(I*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038);config=P();count=I();assert egl.eglChooseConfig(D,attrs,C.byref(config),1,C.byref(count)) and count.value
W,H=480,270;surf=egl.eglCreatePbufferSurface(D,config,(I*5)(0x3057,W,0x3056,H,0x3038));ctx=egl.eglCreateContext(D,config,None,(I*3)(0x3098,2,0x3038));assert egl.eglMakeCurrent(D,surf,surf,ctx)
def gl(name,result,*args):return C.CFUNCTYPE(result,*args)(egl.eglGetProcAddress(name.encode()))
createShader=gl('glCreateShader',U,U);shaderSource=gl('glShaderSource',None,U,I,P,P);compileShader=gl('glCompileShader',None,U);getShader=gl('glGetShaderiv',None,U,U,P);shaderLog=gl('glGetShaderInfoLog',None,U,I,P,P)
createProgram=gl('glCreateProgram',U);attach=gl('glAttachShader',None,U,U);link=gl('glLinkProgram',None,U);getProgram=gl('glGetProgramiv',None,U,U,P);programLog=gl('glGetProgramInfoLog',None,U,I,P,P);use=gl('glUseProgram',None,U)
loc=gl('glGetUniformLocation',I,U,C.c_char_p);u1f=gl('glUniform1f',None,I,F);u2f=gl('glUniform2f',None,I,F,F);u1i=gl('glUniform1i',None,I,I)
getAttrib=gl('glGetAttribLocation',I,U,C.c_char_p);enable=gl('glEnableVertexAttribArray',None,U);attrib=gl('glVertexAttribPointer',None,U,I,U,U,I,P);draw=gl('glDrawArrays',None,U,I,I);viewport=gl('glViewport',None,I,I,I,I);read=gl('glReadPixels',None,I,I,I,I,U,U,P)
genTextures=gl('glGenTextures',None,I,P);activeTexture=gl('glActiveTexture',None,U);bindTexture=gl('glBindTexture',None,U,U);texParameter=gl('glTexParameteri',None,U,U,I);texImage=gl('glTexImage2D',None,U,I,I,I,I,I,U,U,P)
def shader(kind,source):
 s=createShader(kind);data=C.c_char_p(source.encode());shaderSource(s,1,C.byref(data),None);compileShader(s);ok=I();getShader(s,0x8B81,C.byref(ok));log=C.create_string_buffer(16384);shaderLog(s,len(log),None,log);assert ok.value,log.value.decode();return s
def program(v,f):
 p=createProgram();attach(p,shader(0x8B31,v));attach(p,shader(0x8B30,f));link(p);ok=I();getProgram(p,0x8B82,C.byref(ok));log=C.create_string_buffer(16384);programLog(p,len(log),None,log);assert ok.value,log.value.decode();return p
