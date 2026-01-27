// Handwriting Canvas Component
const HandwritingCanvas = {
    name: 'HandwritingCanvas',
    template: `
        <div class="canvas-container">
            <div class="canvas-wrapper">
                <canvas 
                    ref="canvas"
                    :width="canvasSize"
                    :height="canvasSize"
                    @touchstart="handleTouchStart"
                    @touchmove="handleTouchMove"
                    @touchend="handleTouchEnd"
                    @mousedown="handleMouseDown"
                    @mousemove="handleMouseMove"
                    @mouseup="handleMouseUp"
                    @mouseleave="handleMouseUp"
                    class="no-select"
                ></canvas>
            </div>
        </div>
    `,
    props: {
        canvasSize: {
            type: Number,
            default: 300
        }
    },
    data() {
        return {
            isDrawing: false,
            ctx: null,
            lastX: 0,
            lastY: 0
        };
    },
    mounted() {
        this.initCanvas();
    },
    methods: {
        initCanvas() {
            const canvas = this.$refs.canvas;
            this.ctx = canvas.getContext('2d');
            
            // Set canvas styling
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            // Fill with white background
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        },

        // Touch event handlers
        handleTouchStart(e) {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.$refs.canvas.getBoundingClientRect();
            
            this.isDrawing = true;
            this.lastX = touch.clientX - rect.left;
            this.lastY = touch.clientY - rect.top;
        },

        handleTouchMove(e) {
            if (!this.isDrawing) return;
            e.preventDefault();
            
            const touch = e.touches[0];
            const rect = this.$refs.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.draw(x, y);
        },

        handleTouchEnd(e) {
            e.preventDefault();
            this.isDrawing = false;
        },

        // Mouse event handlers (for desktop testing)
        handleMouseDown(e) {
            const rect = this.$refs.canvas.getBoundingClientRect();
            this.isDrawing = true;
            this.lastX = e.clientX - rect.left;
            this.lastY = e.clientY - rect.top;
        },

        handleMouseMove(e) {
            if (!this.isDrawing) return;
            
            const rect = this.$refs.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            this.draw(x, y);
        },

        handleMouseUp() {
            this.isDrawing = false;
        },

        // Draw line
        draw(x, y) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(x, y);
            this.ctx.stroke();
            
            this.lastX = x;
            this.lastY = y;
        },

        // Clear canvas
        clear() {
            const canvas = this.$refs.canvas;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
        },

        // Export canvas as Blob
        async getBlob() {
            return new Promise((resolve) => {
                this.$refs.canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            });
        },

        // Check if canvas is empty (all white)
        isEmpty() {
            const canvas = this.$refs.canvas;
            const imageData = this.ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Check if all pixels are white (or nearly white)
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // If any pixel is not white, canvas has content
                if (r < 250 || g < 250 || b < 250) {
                    return false;
                }
            }
            
            return true;
        }
    }
};

// Make it globally available
window.HandwritingCanvas = HandwritingCanvas;
