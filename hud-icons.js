const paths={
 home:'<path d="M3 13L12 5l9 8M5 11v10h14V11M10 21v-7h4v7"/>',
 village:'<path d="M3 10h18L19 5H5zM5 10v11h14V10M8 21v-6h5v6M14 13h3"/>',
 field:'<path d="M12 21V10M12 15C4 16 3 11 3 8c7-1 10 2 9 7ZM12 11c-1-7 4-8 9-8 0 6-3 9-9 8ZM4 21h16"/>',
 pond:'<path d="M4 11c4-6 10-6 14 0-4 6-10 6-14 0ZM18 11l4-4v8ZM9 10h.1M2 20q3-3 6 0t6 0t6 0"/>',
 market:'<path d="M4 9h16l2-5H2zM4 9v12h16V9M8 21v-8h8v8M7 4v5m5-5v5m5-5v5"/>',
 bread:'<path d="M4 10c-3-2-1-7 3-6 2-3 6-3 8 0 4-1 7 4 3 6v10H4zM7 12v4m5-4v4m4-4v4"/>',
 seed:'<path d="M12 21v-9M12 15C4 15 3 11 4 7c6 0 9 3 8 8ZM12 11c0-6 4-8 8-7 1 5-2 8-8 7ZM5 21h14"/>',
 feed:'<path d="M7 8l-2 12c4 3 10 3 14 0L17 8ZM6 8h12M8 3h8l-2 5h-4ZM9 13h.1m4 0h.1m3 3h.1m-6 1h.1"/>',
 fingerling:'<path d="M2 14c3-4 7-4 10 0-3 4-7 4-10 0Zm10 0 3-3v6ZM10 6c3-3 6-3 9 0-3 3-6 3-9 0Zm9 0 3-3v6Z"/>',
 flour:'<path d="M5 7h14l2 14H3ZM7 3h10v4M12 11v7m0-3-3-2m3 0 3-2m-3 7 3-2"/>',
 water:'<path d="M12 2C9 7 4 11 4 15a8 8 0 0 0 16 0c0-4-5-8-8-13ZM8 15c0 3 1 4 3 4"/>',
 vegetables:'<path d="M12 21c-10-4-9-13-4-14 1-6 8-6 9 0 6 1 6 10-5 14ZM12 21V8m0 9-5-4m5 1 5-5"/>',
 fish:'<path d="M3 12c4-7 11-7 15 0-4 7-11 7-15 0Zm15 0 4-5v10ZM9 11h.1M11 6l3-3m-3 15 3 3"/>',
 noodles:'<path d="M3 12h18c-1 7-4 9-9 9s-8-2-9-9ZM7 3v9m5-10v10m5-9v9M7 6q3-3 5 0t5 0"/>',
 meal:'<path d="M3 12h18c-1 7-4 9-9 9s-8-2-9-9ZM5 12c-1-6 3-7 5-6 2-5 7-4 8 1 3 0 4 2 3 5"/>',
 shop:'<path d="M7 7l-2 14h14L17 7ZM8 3h8l-2 4h-4ZM12 10v7m-3-4h6"/>',
 broker:'<path d="M3 21h9l9-15-4-3-9 15-5 3ZM8 18l4 3M3 8h7M3 12h4"/>'
};
export function hudIcon(name){return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.feed}</svg>`;}
