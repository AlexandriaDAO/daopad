import { useRef, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

/**
 * Virtualized list component for efficient rendering of large datasets
 * Only renders visible items plus overscan buffer
 *
 * @param {Array} items - Array of items to render
 * @param {Function} renderItem - Function to render each item (item, index) => ReactNode
 * @param {number} itemHeight - Estimated height of each item in pixels
 * @param {number} overscan - Number of items to render outside viewport
 * @param {string} className - Optional className for the container
 * @param {Object} style - Optional style for the container
 */
export const VirtualizedList = memo(function VirtualizedList({
    items,
    renderItem,
    itemHeight = 60,
    overscan = 5,
    className = '',
    style = {}
}) {
    const parentRef = useRef(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => itemHeight,
        overscan
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div
            ref={parentRef}
            className={className}
            style={{
                height: '600px',
                overflow: 'auto',
                ...style
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                }}
            >
                {virtualItems.map(virtualRow => (
                    <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            transform: `translateY(${virtualRow.start}px)`
                        }}
                    >
                        {renderItem(items[virtualRow.index], virtualRow.index)}
                    </div>
                ))}
            </div>
        </div>
    );
});

/**
 * Virtualized table component for efficient rendering of table rows
 * Similar to VirtualizedList but optimized for table structure
 */
export const VirtualizedTable = memo(function VirtualizedTable({
    items,
    renderRow,
    renderHeader,
    rowHeight = 48,
    overscan = 5,
    className = '',
    style = {}
}) {
    const parentRef = useRef(null);

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => rowHeight,
        overscan
    });

    const virtualItems = virtualizer.getVirtualItems();

    return (
        <div className={className} style={style}>
            {renderHeader && (
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--background)' }}>
                    {renderHeader()}
                </div>
            )}
            <div
                ref={parentRef}
                style={{
                    height: '500px',
                    overflow: 'auto'
                }}
            >
                <div
                    style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative'
                    }}
                >
                    {virtualItems.map(virtualRow => (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                transform: `translateY(${virtualRow.start}px)`
                            }}
                        >
                            {renderRow(items[virtualRow.index], virtualRow.index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default VirtualizedList;
