import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import logoSFM from '../../assets/images/LOGO_SFM.png';
import {
    animate,
    stagger,
    createTimeline,
    createDrawable,
    createDraggable,
    createSpring,
    createScope,
    onScroll,
} from 'animejs';
import './Login.css';

/* ──────────────────────────────────────────────────────
   ICONS
   ────────────────────────────────────────────────────── */
const IconBrain = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a6 6 0 0 1 6 6c0 2-1 3.5-2 4.5" />
        <path d="M6 8a6 6 0 0 1 12 0" />
        <path d="M6 8c0 2 1 3.5 2 4.5" />
        <path d="M8 12.5C6.5 14 6 16 6 18h12c0-2-.5-4-2-5.5" />
        <path d="M9 18v2" /><path d="M15 18v2" /><path d="M12 18v2" />
        <path d="M10 8.5a2 2 0 0 1 4 0" />
    </svg>
);
const IconMic = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10a7 7 0 0 0 14 0" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);
const IconFile = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
);
const IconActivity = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);
const IconAlert = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);
const IconArrow = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ width: 16, height: 16, flexShrink: 0 }}>
        <path d="M4 10h12M10 4l6 6-6 6" />
    </svg>
);

/* ──────────────────────────────────────────────────────
   PARTICLE FIELD  (canvas — mouse-reactive neural net)
   ────────────────────────────────────────────────────── */
const ParticleField = ({ containerRef }) => {
    const canvasRef = useRef(null);
    const rafRef = useRef(null);
    const mouseRef = useRef({ x: -9999, y: -9999 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;
        const ctx = canvas.getContext('2d');
        let W = 0, H = 0, particles = [];

        const COUNT = 80, LINK = 130, REPEL = 110;

        const resize = () => {
            const r = container.getBoundingClientRect();
            W = canvas.width = r.width;
            H = canvas.height = r.height;
        };

        const init = () => {
            particles = Array.from({ length: COUNT }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
                r: Math.random() * 1.5 + .5,
                a: Math.random() * .45 + .15,
            }));
        };

        const draw = () => {
            ctx.clearRect(0, 0, W, H);
            const { x: mx, y: my } = mouseRef.current;

            particles.forEach(p => {
                const dx = p.x - mx, dy = p.y - my;
                const d = Math.hypot(dx, dy);
                if (d < REPEL) {
                    const f = (REPEL - d) / REPEL;
                    p.vx += (dx / d) * f * .07;
                    p.vy += (dy / d) * f * .07;
                }
                p.vx *= .983; p.vy *= .983;
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
                if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
            });

            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const d = Math.hypot(dx, dy);
                    if (d < LINK) {
                        const a = (1 - d / LINK) * .18;
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(30, 58, 138, ${a})`;
                        ctx.lineWidth = .5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }

            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(30, 58, 138, ${p.a})`;
                ctx.fill();
            });

            rafRef.current = requestAnimationFrame(draw);
        };

        const onMove = (e) => {
            const r = canvas.getBoundingClientRect();
            mouseRef.current = { x: e.clientX - r.left, y: e.clientY - r.top };
        };
        const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };

        resize(); init(); draw();
        const ro = new ResizeObserver(() => { resize(); init(); });
        ro.observe(container);
        container.addEventListener('mousemove', onMove);
        container.addEventListener('mouseleave', onLeave);

        return () => {
            cancelAnimationFrame(rafRef.current);
            ro.disconnect();
            container.removeEventListener('mousemove', onMove);
            container.removeEventListener('mouseleave', onLeave);
        };
    }, [containerRef]);

    return (
        <canvas ref={canvasRef}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}
        />
    );
};

/* ──────────────────────────────────────────────────────
   GEOMETRIC RINGS SVG  (draw animated on scroll)
   ────────────────────────────────────────────────────── */
const RingsSVG = () => (
    <svg className="rings-svg" viewBox="0 0 600 600" fill="none"
        strokeLinecap="round" strokeLinejoin="round"
        preserveAspectRatio="xMidYMid slice">
        <polygon className="rd" points="300,30 548,165 548,435 300,570 52,435 52,165" strokeWidth="1" />
        <polygon className="rd" points="300,90 492,202 492,398 300,510 108,398 108,202" strokeWidth="1" strokeDasharray="5 7" />
        <polygon className="rd" points="300,150 436,237 436,363 300,450 164,363 164,237" strokeWidth="1" />
        <circle className="rd" cx="300" cy="300" r="230" strokeWidth="1" />
        <circle className="rd" cx="300" cy="300" r="175" strokeWidth="1" strokeDasharray="4 6" />
        <circle className="rd" cx="300" cy="300" r="120" strokeWidth="1" />
        <circle className="rd" cx="300" cy="300" r="68" strokeWidth="1" strokeDasharray="3 5" />
        <circle className="rd" cx="300" cy="300" r="24" strokeWidth="2" />
        <line className="rd" x1="300" y1="70" x2="300" y2="530" strokeWidth="1" />
        <line className="rd" x1="70" y1="300" x2="530" y2="300" strokeWidth="1" />
        <line className="rd" x1="130" y1="130" x2="470" y2="470" strokeWidth="1" strokeDasharray="3 7" />
        <line className="rd" x1="470" y1="130" x2="130" y2="470" strokeWidth="1" strokeDasharray="3 7" />
        <path className="rd-acc" d="M300,70 A230,230 0 0,1 530,300" strokeWidth="2" />
        <path className="rd-acc" d="M70,300 A230,230 0 0,1 300,530" strokeWidth="2" />
        <path className="rd-acc" d="M300,150 A150,150 0 0,0 150,300" strokeWidth="1.5" />
        <path className="rd-acc" d="M300,150 A150,150 0 0,1 450,300" strokeWidth="1.5" />
    </svg>
);

/* ──────────────────────────────────────────────────────
   GLASS ORB  (draggable)
   ────────────────────────────────────────────────────── */
const GlOrb = ({ cls }) => (
    <div className={`gl-orb ${cls}`}>
        <div className="gl-orb__inner" />
        <div className="gl-orb__glint" />
    </div>
);

/* ──────────────────────────────────────────────────────
   LOGIN PAGE
   ────────────────────────────────────────────────────── */
export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const scrollRef = useRef(null);
    const pageRef = useRef(null);
    const leftRef = useRef(null);
    const leftContentRef = useRef(null);
    const rightRef = useRef(null);

    const logoRef = useRef(null);
    const eyebrowRef = useRef(null);
    const titleRef = useRef(null);
    const subRef = useRef(null);
    const pillsRef = useRef(null);
    const statsRef = useRef(null);

    const cardRef = useRef(null);
    const f1Ref = useRef(null);
    const f2Ref = useRef(null);
    const btnRef = useRef(null);
    const shimmerRef = useRef(null);
    const btnAnimRef = useRef(null);

    /* ── Draggable orbs with spring ── */
    useEffect(() => {
        createDraggable('.gl-orb', {
            releaseEase: createSpring({ stiffness: 110, damping: 7, mass: 1.3 }),
        });
    }, []);

    /* ── SVG draw reveal on scroll ── */
    useEffect(() => {
        const els = document.querySelectorAll('.rings-svg .rd, .rings-svg .rd-acc');
        if (!els.length) return;
        animate(createDrawable(els), {
            draw: ['0 0', '0 1', '1 1'],
            delay: stagger(28),
            ease: 'inOut(3)',
            autoplay: onScroll({ sync: true, container: scrollRef.current || document.body }),
        });
    }, []);

    /* ── Rings rotation ── */
    useEffect(() => {
        animate('.rings-svg', {
            rotate: [0, 360],
            duration: 90000,
            ease: 'linear',
            loop: true,
        });
        // Center dot breathe
        animate('.rings-svg circle:last-of-type', {
            opacity: [0.3, 1, 0.3],
            scale: [0.85, 1.15, 0.85],
            duration: 3600,
            ease: 'inOutSine',
            loop: true,
        });
    }, []);

    /* ── Responsive float scope ── */
    useEffect(() => {
        let scope;
        try {
            scope = createScope({ mediaQueries: { portrait: '(orientation: portrait)' } });
            scope.add(({ matches }) => {
                createTimeline({ loop: true, alternate: true }).add('.gl-orb', {
                    y: matches.portrait ? [-22, 22] : 0,
                    x: matches.portrait ? 0 : [-22, 22],
                    duration: 4500,
                    ease: 'inOutSine',
                }, stagger(350));
            });
        } catch {
            animate('.gl-orb', {
                y: [-20, 20], duration: 4500,
                ease: 'inOutSine', loop: true, alternate: true,
                delay: stagger(350),
            });
        }
        return () => scope?.revert?.();
    }, []);

    /* ── Entrance timeline ── */
    useEffect(() => {
        const tl = createTimeline({ defaults: { ease: 'easeOutExpo' } });

        tl.add(logoRef.current, { opacity: [0, 1], scale: [0.5, 1], rotate: ['-18deg', '0deg'], duration: 1100 }, 60);
        tl.add(eyebrowRef.current, { opacity: [0, 1], translateY: [6, 0], duration: 600 }, 300);
        tl.add(titleRef.current, { opacity: [0, 1], translateY: [28, 0], duration: 950 }, 400);
        tl.add(subRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 750 }, 620);

        if (pillsRef.current) {
            tl.add(Array.from(pillsRef.current.children), {
                opacity: [0, 1], translateY: [10, 0], duration: 520,
                delay: stagger(100),
            }, 780);
        }

        if (statsRef.current) {
            tl.add(Array.from(statsRef.current.children), {
                opacity: [0, 1], translateY: [18, 0], scale: [0.95, 1], duration: 650,
                delay: stagger(130),
            }, 920);
        }

        tl.add(cardRef.current, { opacity: [0, 1], translateX: [44, 0], duration: 950 }, 320);
        tl.add(f1Ref.current, { opacity: [0, 1], translateX: [22, 0], duration: 650 }, 560);
        tl.add(f2Ref.current, { opacity: [0, 1], translateX: [22, 0], duration: 650 }, 700);
        tl.add(btnRef.current, { opacity: [0, 1], translateY: [18, 0], duration: 750 }, 870);

        animate('.gl-orb', {
            opacity: [0, 1], scale: [0.3, 1],
            duration: 1400, ease: 'easeOutExpo',
            delay: stagger(200),
        });

        animate(shimmerRef.current, {
            translateX: ['-130%', '230%'],
            duration: 3000, ease: 'inOutQuart',
            loop: true, delay: 3500,
        });
    }, []);

    /* ── Mouse 3-D tilt on left panel ── */
    useEffect(() => {
        const el = leftRef.current;
        if (!el) return;
        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const rx = ((e.clientY - r.top - r.height / 2) / (r.height / 2)) * 4.5;
            const ry = -((e.clientX - r.left - r.width / 2) / (r.width / 2)) * 4.5;
            animate(leftContentRef.current, {
                rotateX: rx, rotateY: ry,
                duration: 850, ease: 'outQuart',
            });
        };
        const onLeave = () => animate(leftContentRef.current, {
            rotateX: 0, rotateY: 0,
            duration: 1100, ease: 'outElastic(1, .5)',
        });
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
        return () => {
            el.removeEventListener('mousemove', onMove);
            el.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    /* ── Input focus ── */
    const onFocus = useCallback((e) => {
        animate(e.target.closest('.lf'), {
            scale: [1, 1.013], duration: 300, ease: 'outQuart',
        });
    }, []);
    const onBlur = useCallback((e) => {
        animate(e.target.closest('.lf'), {
            scale: [1.013, 1], duration: 300, ease: 'outQuart',
        });
    }, []);

    /* ── Button hover ── */
    const onBtnEnter = useCallback(() => {
        if (loading) return;
        animate(btnRef.current, { scale: 1.028, duration: 420, ease: 'outElastic(1,.7)' });
    }, [loading]);
    const onBtnLeave = useCallback(() => {
        if (loading) return;
        animate(btnRef.current, { scale: 1, duration: 300, ease: 'outQuart' });
    }, [loading]);

    /* ── Submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        btnAnimRef.current = animate(btnRef.current, {
            scale: [1, 0.97, 1], ease: 'inOutSine', duration: 1000, loop: true,
        });

        try {
            const { data: { token } } = await api.post('/auth/login', { email, password });
            if (!token) throw new Error('no_token');
            localStorage.setItem('access_token', token);
            const { data: user } = await api.get('/auth/me');
            localStorage.setItem('user_data', JSON.stringify(user));
            btnAnimRef.current?.cancel();

            const exit = createTimeline({ defaults: { ease: 'easeInOutExpo' } });
            exit
                .add(rightRef.current, { opacity: [1, 0], translateX: [0, 50], duration: 500 }, 0)
                .add(leftContentRef.current, { opacity: [1, 0], scale: [1, .96], duration: 500 }, 80)
                .add(pageRef.current, {
                    opacity: [1, 0], duration: 400,
                    onComplete: () => navigate(user.roles?.includes('ROLE_ADMIN') ? '/admin' : '/archive'),
                }, 380);
        } catch (err) {
            setError(err?.response?.data?.message || 'Email ou mot de passe incorrect.');
            setLoading(false);
            btnAnimRef.current?.cancel();
            animate(cardRef.current, {
                translateX: [0, -16, 16, -10, 10, -5, 5, 0],
                duration: 620, ease: 'outSine',
            });
        }
    };

    /* ── Render ── */
    return (
        <div ref={scrollRef} className="l-scroll">
            <div ref={pageRef} className="l-page">

                {/* ═══ LEFT ═══ */}
                <div ref={leftRef} className="l-left">
                    <ParticleField containerRef={leftRef} />
                    <RingsSVG />

                    <div className="lg lg-1" /><div className="lg lg-2" /><div className="lg lg-3" />

                    <GlOrb cls="orb-a" />
                    <GlOrb cls="orb-b" />
                    <GlOrb cls="orb-c" />

                    <div ref={leftContentRef} className="l-left__body" style={{ transformStyle: 'preserve-3d' }}>

                        <div ref={logoRef} className="ll-logo" style={{ opacity: 0 }}>
                            <img src={logoSFM} alt="SFM Logo" className="ll-logo__img" />
                        </div>

                        <p ref={eyebrowRef} className="ll-eyebrow" style={{ opacity: 0 }}>
                            Plateforme d'Intelligence Réunion
                        </p>

                        <h1 ref={titleRef} className="ll-title" style={{ opacity: 0 }}>
                            Meeting<em>IA</em>
                        </h1>

                        <p ref={subRef} className="ll-sub" style={{ opacity: 0 }}>
                            Capturez, analysez et exploitez chaque réunion
                            grâce à l'intelligence artificielle avancée.
                        </p>

                        <div ref={pillsRef} className="ll-pills">
                            {[
                                [<IconMic />, 'Capture audio'],
                                [<IconFile />, 'Transcription IA'],
                                [<IconActivity />, 'Analyse comportementale'],
                            ].map(([ic, lbl], i) => (
                                <span key={i} className="ll-pill" style={{ opacity: 0 }}>{ic}{lbl}</span>
                            ))}
                        </div>

                        <div ref={statsRef} className="ll-stats">
                            {[['98%', 'Précision'], ['3×', 'Productivité'], ['< 2 min', 'Analyse']].map(([v, l], i) => (
                                <div key={i} className="ll-stat" style={{ opacity: 0 }}>
                                    <span className="ll-stat__val">{v}</span>
                                    <span className="ll-stat__lbl">{l}</span>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>

                {/* ═══ RIGHT ═══ */}
                <div ref={rightRef} className="l-right">
                    <div className="l-right__vline" />

                    <div ref={cardRef} className="lf-card" style={{ opacity: 0 }}>
                        <div className="lf-header">
                            <span className="lf-badge">Accès sécurisé</span>
                            <h2 className="lf-title">Connexion</h2>
                            <p className="lf-desc">Accédez à votre espace d'analyse intelligent</p>
                        </div>

                        <form onSubmit={handleSubmit} noValidate>
                            <div ref={f1Ref} className="lf" style={{ opacity: 0 }}>
                                <label className="lf__lbl">Adresse email</label>
                                <div className="lf__wrap">
                                    <input className="lf__inp" type="email"
                                        value={email} onChange={e => setEmail(e.target.value)}
                                        onFocus={onFocus} onBlur={onBlur}
                                        required placeholder="admin@meeting-ia.com" />
                                    <div className="lf__line" />
                                </div>
                            </div>

                            <div ref={f2Ref} className="lf" style={{ opacity: 0 }}>
                                <div className="lf__lbl-row">
                                    <label className="lf__lbl">Mot de passe</label>
                                    <a href="#" className="lf__forgot">Oublié ?</a>
                                </div>
                                <div className="lf__wrap">
                                    <input className="lf__inp" type="password"
                                        value={password} onChange={e => setPassword(e.target.value)}
                                        onFocus={onFocus} onBlur={onBlur}
                                        required placeholder="••••••••" />
                                    <div className="lf__line" />
                                </div>
                            </div>

                            {error && (
                                <div className="lf-error">
                                    <IconAlert />{error}
                                </div>
                            )}

                            <button ref={btnRef} type="submit" disabled={loading}
                                className="lf-btn" style={{ opacity: 0 }}
                                onMouseEnter={onBtnEnter} onMouseLeave={onBtnLeave}>
                                <span ref={shimmerRef} className="lf-btn__sh" />
                                {loading
                                    ? <><span className="lf-spin" />Analyse en cours…</>
                                    : <>Accéder au système <IconArrow /></>
                                }
                            </button>
                        </form>

                        <p className="lf-note">
                            Connexion chiffrée TLS 1.3 · Données hébergées en France
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}