import { useEffect, useRef, useState, memo } from 'react';

/**
 * Lazy loading image component with Intersection Observer
 * Only loads images when they enter the viewport
 * Provides smooth loading transitions and error handling
 *
 * @param {string} src - Image source URL
 * @param {string} placeholder - Placeholder image URL (optional)
 * @param {string} alt - Alt text for accessibility
 * @param {string} className - CSS class names
 * @param {number} threshold - Intersection observer threshold (0-1)
 * @param {string} rootMargin - Root margin for intersection observer
 * @param {Function} onLoad - Callback when image loads
 * @param {Function} onError - Callback when image fails to load
 */
export const LazyImage = memo(function LazyImage({
    src,
    placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23eee" width="100" height="100"/%3E%3C/svg%3E',
    alt = '',
    className = '',
    threshold = 0.1,
    rootMargin = '50px',
    onLoad,
    onError,
    ...props
}) {
    const [imageSrc, setImageSrc] = useState(placeholder);
    const [imageRef, setImageRef] = useState(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const observerRef = useRef(null);

    useEffect(() => {
        if (!imageRef || imageSrc !== placeholder) return;

        // Create intersection observer
        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Image is in viewport, start loading
                        setImageSrc(src);
                        // Stop observing
                        if (observerRef.current && imageRef) {
                            observerRef.current.unobserve(imageRef);
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin
            }
        );

        // Start observing
        observerRef.current.observe(imageRef);

        // Cleanup
        return () => {
            if (observerRef.current && imageRef) {
                observerRef.current.unobserve(imageRef);
            }
        };
    }, [imageRef, imageSrc, placeholder, src, threshold, rootMargin]);

    const handleLoad = () => {
        setIsLoaded(true);
        onLoad?.();
    };

    const handleError = (e) => {
        setHasError(true);
        onError?.(e);
    };

    const combinedClassName = [
        className,
        'lazy-image',
        isLoaded && 'lazy-image--loaded',
        hasError && 'lazy-image--error'
    ].filter(Boolean).join(' ');

    return (
        <img
            ref={setImageRef}
            src={imageSrc}
            alt={alt}
            className={combinedClassName}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            {...props}
        />
    );
});

/**
 * Background image component with lazy loading
 * Useful for hero sections, banners, etc.
 */
export const LazyBackgroundImage = memo(function LazyBackgroundImage({
    src,
    placeholder,
    className = '',
    threshold = 0.1,
    rootMargin = '50px',
    children,
    onLoad,
    onError,
    ...props
}) {
    const [backgroundImage, setBackgroundImage] = useState(
        placeholder ? `url(${placeholder})` : 'none'
    );
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [elementRef, setElementRef] = useState(null);
    const observerRef = useRef(null);

    useEffect(() => {
        if (!elementRef || isLoaded) return;

        observerRef.current = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Load the image
                        const img = new Image();
                        img.onload = () => {
                            setBackgroundImage(`url(${src})`);
                            setIsLoaded(true);
                            onLoad?.();
                        };
                        img.onerror = (e) => {
                            setHasError(true);
                            onError?.(e);
                        };
                        img.src = src;

                        // Stop observing
                        if (observerRef.current && elementRef) {
                            observerRef.current.unobserve(elementRef);
                        }
                    }
                });
            },
            {
                threshold,
                rootMargin
            }
        );

        observerRef.current.observe(elementRef);

        return () => {
            if (observerRef.current && elementRef) {
                observerRef.current.unobserve(elementRef);
            }
        };
    }, [elementRef, src, threshold, rootMargin, isLoaded, onLoad, onError]);

    const combinedClassName = [
        className,
        'lazy-background',
        isLoaded && 'lazy-background--loaded',
        hasError && 'lazy-background--error'
    ].filter(Boolean).join(' ');

    return (
        <div
            ref={setElementRef}
            className={combinedClassName}
            style={{ backgroundImage, ...props.style }}
            {...props}
        >
            {children}
        </div>
    );
});

/**
 * Progressive image component
 * Shows low-quality placeholder first, then loads high-quality image
 */
export const ProgressiveImage = memo(function ProgressiveImage({
    src,
    placeholderSrc,
    alt = '',
    className = '',
    onLoad,
    onError,
    ...props
}) {
    const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (!src) return;

        // Load high-quality image
        const img = new Image();
        img.onload = () => {
            setCurrentSrc(src);
            setIsLoading(false);
            onLoad?.();
        };
        img.onerror = (e) => {
            setHasError(true);
            setIsLoading(false);
            onError?.(e);
        };
        img.src = src;
    }, [src, onLoad, onError]);

    const combinedClassName = [
        className,
        'progressive-image',
        isLoading && 'progressive-image--loading',
        hasError && 'progressive-image--error'
    ].filter(Boolean).join(' ');

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={combinedClassName}
            loading="lazy"
            {...props}
        />
    );
});

export default LazyImage;
