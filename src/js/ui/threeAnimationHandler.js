import * as THREE from 'three';

/**
 * Constants for animation configuration
 */
export const ANIMATION_CONFIG = {
    // Duration in milliseconds
    DURATION: 500,
    
    // Arc configuration
    ARC_HEIGHT: 2.0,  // Height of the arc in world units
    ARC_SEGMENTS: 32, // Number of segments for arc path
    
    // Easing functions
    EASING: {
        LINEAR: (t) => t,
        EASE_IN: (t) => t * t,
        EASE_OUT: (t) => t * (2 - t),
        EASE_IN_OUT: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        BOUNCE: (t) => {
            // Improved bounce function that guarantees ending exactly at 1.0
            if (t >= 1.0) return 1.0; // Ensure we return exactly 1 at the end
            
            // Simplified version with fewer bounces and more predictable behavior
            const a = 7.5625; // Bounce intensity
            const d = 2.75;   // Controls number of bounces
            
            if (t < 1 / d) {
                return a * t * t;
            } else if (t < 2 / d) {
                return a * (t -= 1.5 / d) * t + 0.75;
            } else if (t < 2.5 / d) {
                return a * (t -= 2.25 / d) * t + 0.9375;
            } else {
                // Final bounce - ensure we approach exactly 1.0 at t=1.0
                t = Math.min(t, 0.999); // Cap at just below 1 to avoid potential calculation issues
                return a * (t -= 2.625 / d) * t + 0.984375;
            }
        },
        ELASTIC: (t) => {
            const p = 0.3;
            return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
        }
    }
};

/**
 * ThreeAnimationHandler - Handles animations for 3D objects in the game
 */
export class ThreeAnimationHandler {
    constructor() {
        this.animations = new Map(); // Store active animations
        this.animationId = 0; // Unique ID for animations
        this.isEnabled = true; // Global animation toggle
    }

    /**
     * Enable or disable all animations
     * @param {boolean} enabled - Whether animations should be enabled
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            // Complete all running animations immediately
            this.completeAllAnimations();
        }
    }

    /**
     * Animate an object from one position to another
     * @param {THREE.Object3D} object - The object to animate
     * @param {THREE.Vector3} startPos - Starting position
     * @param {THREE.Vector3} endPos - Ending position
     * @param {Object} options - Animation options
     * @returns {Promise} - Promise that resolves when animation completes
     */
    animatePosition(object, startPos, endPos, options = {}) {
        if (!this.isEnabled) {
            object.position.copy(endPos);
            return Promise.resolve();
        }

        const {
            easing = ANIMATION_CONFIG.EASING.LINEAR,
            duration = ANIMATION_CONFIG.DURATION,
            onComplete = null
        } = options;

        // If start and end positions are the same, no need to animate
        if (startPos.equals(endPos)) {
            if (onComplete) onComplete();
            return Promise.resolve();
        }

        // Create arc path if movement is not purely vertical
        const hasHorizontalMovement = startPos.x !== endPos.x || startPos.z !== endPos.z;
        let path = null;
        if (hasHorizontalMovement) {
            path = this.createArcPath(startPos, endPos);
        }

        return this.createAnimation(object, {
            startTime: performance.now(),
            duration,
            easing,
            startPos,
            endPos,
            path,
            onComplete
        });
    }

    /**
     * Animate object opacity
     * @param {THREE.Object3D} object - The object to animate
     * @param {number} startOpacity - Starting opacity (0-1)
     * @param {number} endOpacity - Ending opacity (0-1)
     * @param {Object} options - Animation options
     * @returns {Promise} - Promise that resolves when animation completes
     */
    animateOpacity(object, startOpacity, endOpacity, options = {}) {
        if (!this.isEnabled) {
            this.setObjectOpacity(object, endOpacity);
            return Promise.resolve();
        }

        const {
            easing = ANIMATION_CONFIG.EASING.LINEAR,
            duration = ANIMATION_CONFIG.DURATION,
            onComplete = null
        } = options;

        return this.createAnimation(object, {
            startTime: performance.now(),
            duration,
            easing,
            startOpacity,
            endOpacity,
            onComplete
        });
    }

    /**
     * Create a sequence of animations
     * @param {Array} animations - Array of animation promises
     * @returns {Promise} - Promise that resolves when all animations complete
     */
    async sequence(animations) {
        for (const animation of animations) {
            await animation;
        }
    }

    /**
     * Create an arc path between two points
     * @param {THREE.Vector3} start - Starting point
     * @param {THREE.Vector3} end - Ending point
     * @returns {THREE.CurvePath} - The arc path
     */
    createArcPath(start, end) {
        const midPoint = new THREE.Vector3()
            .addVectors(start, end)
            .multiplyScalar(0.5);
        
        // Raise the midpoint to create an arc
        midPoint.y += ANIMATION_CONFIG.ARC_HEIGHT;

        const curve = new THREE.QuadraticBezierCurve3(
            start,
            midPoint,
            end
        );

        const path = new THREE.CurvePath();
        path.add(curve);
        return path;
    }

    /**
     * Create and start a new animation
     * @param {THREE.Object3D} object - The object to animate
     * @param {Object} animationData - Animation configuration
     * @returns {Promise} - Promise that resolves when animation completes
     */
    createAnimation(object, animationData) {
        return new Promise((resolve) => {
            const id = this.animationId++;
            this.animations.set(id, {
                object,
                ...animationData,
                resolve
            });

            this.animate(id);
        });
    }

    /**
     * Animate a specific animation
     * @param {number} id - Animation ID
     */
    animate(id) {
        const animation = this.animations.get(id);
        if (!animation) return;

        const now = performance.now();
        const elapsed = now - animation.startTime;
        const progress = Math.min(elapsed / animation.duration, 1);

        // Apply easing
        const easedProgress = animation.easing(progress);

        // Update position
        if (animation.path) {
            // Follow arc path
            const point = animation.path.getPoint(easedProgress);
            animation.object.position.copy(point);
        } else {
            // Linear interpolation
            animation.object.position.lerpVectors(
                animation.startPos,
                animation.endPos,
                easedProgress
            );
        }

        // Update opacity if specified
        if (animation.startOpacity !== undefined && animation.endOpacity !== undefined) {
            const opacity = THREE.MathUtils.lerp(
                animation.startOpacity,
                animation.endOpacity,
                easedProgress
            );
            this.setObjectOpacity(animation.object, opacity);
        }

        // Check if animation is complete
        if (progress >= 1) {
            this.completeAnimation(id);
        } else {
            requestAnimationFrame(() => this.animate(id));
        }
    }

    /**
     * Complete an animation
     * @param {number} id - Animation ID
     */
    completeAnimation(id) {
        const animation = this.animations.get(id);
        if (!animation) return;

        // Ensure final values are set
        if (animation.path) {
            animation.object.position.copy(animation.endPos);
        } else {
            animation.object.position.copy(animation.endPos);
        }

        if (animation.startOpacity !== undefined && animation.endOpacity !== undefined) {
            this.setObjectOpacity(animation.object, animation.endOpacity);
        }

        // Call completion callback if specified
        if (animation.onComplete) {
            animation.onComplete();
        }

        // Resolve the promise
        animation.resolve();

        // Remove the animation
        this.animations.delete(id);
    }

    /**
     * Complete all running animations immediately
     */
    completeAllAnimations() {
        for (const [id] of this.animations) {
            this.completeAnimation(id);
        }
    }

    /**
     * Set opacity for an object and all its children
     * @param {THREE.Object3D} object - The object to update
     * @param {number} opacity - Opacity value (0-1)
     */
    setObjectOpacity(object, opacity) {
        object.traverse((child) => {
            if (child.isMesh) {
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => {
                            material.transparent = true;
                            material.opacity = opacity;
                        });
                    } else {
                        child.material.transparent = true;
                        child.material.opacity = opacity;
                    }
                }
            }
        });
    }
} 