import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatarMoeda } from "./utils.js";
import { METAS } from "./dashboard.js";

const LOGO_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAYAAAA+s9J6AAAQAElEQVR4Aex9B7xkRZX+V1U3dXzxEjDkJEkURJHgkAWUPGSQLGCOa9wdXXfV1ZVVTAhIlDQiCBIlDDkJCIiS4+SZlzreVFX/r/oNrv/96a4wg7yZ6Tt9+t6uW/fec06d75xTp7rfSHS3rga6GnhLNdAF4Vuq/u7DuxoAuiDsWkFXA2+xBrogfIsHoPv4rga6IFx9bKAr6QTVQBeEE3RgumytPhrogvD1GauupBNUA10QTtCB6bK1+migC8LVZ6y7kk5QDXRB+AYG5si7rniBr3OH/u3ZbZPwjW7vdOetvg3e4//B7Z37XWdsMzP5wF+b/H/qb3dsPQ38413Hbp61nxrqpN1v37qNtqkPk71jLxF7yZAay0Vf7Feyrw/ZIv7m4d/daMY7zYZ/Y2X79pqNm9n7d3dsHaNMN22UaRLJMJIKo1FgM9lGZFMpLJVskJ2xyxc7D9uTw/f79i+s/+3Hf3TTT9731Q+d99Wbzj7mGx/+5FeO/OdPHvadr/3zfh/Ydv93T99pr5222X76zB2L2+6/ZaZ2nNq379r+rd9db8Z+c6bttd/s96w3Zdp2U6Zvu+XUGbttMm3ft02dtv+MN+3nPnPmLl9+/7sjic5WmwMBKF3UR6HzEDoHk3O49h28B/RRvE6qLZDiVvBUo5jBSr6GF2w8Y/Wso03rjLPv+PWz7nrnHy57++o7fXR6f7J/VmnCv3uH5p02POi3O/KHh/LqTiIzrVhbOYxMuVbZmcoyzVUtRI5r3s+5LhW8hl/gx3xunmjcyo3M//eDd3b69b3mqT/cc+Qf9vrf67+68I5/+N4XN3jHrBsf+fC9l/3jf134jZ9/+XNfvPjcz3zn4i9/4TvnfeaU7/zrMd//2lfe+72vn3bkp0791vuO+ezJb/3YeV897JPnnLXnp76y57u/+NV3bf+F83bc7QPbv33vM3d91zmXvuOwH27+0S9M+vd/mPpvZ235wbP/Y6vPf2vdbb94zbRdLr5j2m6/vH7aLtffPm2X65+YtssNT03b/don0T7rF7hXoWe2R/+P4f4jM7Y6+JGZ79r/M1/e4stL2vbXH3/+vj+u+8Qv3v/3F2+37tbvnT19jZN3+M7BP/t/dz7jmlN/eNb3PnrOkT/71ic+fsaxH/vqGSe+91tffe+nzzlh3/NOO+TD55+y37nnnrz/eV868IDvnL7/B8/9yunHf/CLPzrmqC9+/6h3f/rHR7z3hC/u++7jPr/bke/e7BvbTdl4/c9N2eS8TQe2/PF2A1t9dvOBbU7ZfGDrn24xsM2Fmw5sc/E7ByZd+NVNBra6fPOB7a+bsfnsa7cZmP3I/50++62HbDow+7H/Hdj+pVc3HHjyvJ0G5j35HwM7vPTQ+wfm/XnB1tmvvr+dte3i1l2T5+xw1zYf2OF/Xz3y6L90PvN3OnT6+jPG3xG1cO9TZ24x+NrJGyb2Y/Oa4iNpe2g9bDGEhQAZSOF5bC1goiB8rmdAeB7PxWs5x7U0jj0AZwQQBwgkMF7Yc9inY4Ms6F4sgJQDMQKLQJSW14BAz6BuPVhDp4Csf/F+3I/rBf8mPpP38IFYSbcX58O9C3xGX8y8Jj4Djh4DnCI/08DjQ4kY0pEHGDEEH7/rMEr7PqyY1v+UPM9teM7mP99n8szbtpgx+/D1+9L31mnkb5+a6fPXKuIfL/JX7pWKJf06/WOZqP78PK/Ty9oYyY+L/r3+YPN/P7jRgT/Lt1j3pKaOcpRf/yK8y5eLM8K5/uOVB/71/qeuf+iOux/+5YM/+t0f/nL/vfe+I197/fS2H0xbbRqod8+Ta22/aNs5C7ebs2DrOb/Bvy3bz50zbcf5s9E2s79bNp+7YJM5izadO/+VadPnvrpZ/xoXrN3X2n9NreL8Nft7dp/+cPqvUK/L2Fea5Zwn0prmB3nSsyoP3BLni3E8Wxo0ow4MhC3cQHgC7xN+gUDN4xvCwCkEB1ZCF4DRfOE5HCH3xR2IJwIIxhAedx4CLkC/AUBeKwK+z4FCp3QM9/VTp8Z9EUA8nyDkvmMQBgiOAa/Hb8AXAeT7YsADwHyHwSd45hAIfv7HQBx8voT5+6YP6F039Q/6dbNO/dsN2P7rNps29A1bb/rgVttsvMcWm8zakXSpbcu3sbYfK67D33DtT2ftz21H91s29+2W2XfY7/+4LLar5DVfP8Z2Gr+P74Q/dJvuO/ZDf89jvx/+DH1+/H30G/v+DP2NTdfb79C/Dw9En2svPeY3PpN+99/X1Sd26M+a9oZ+3+1jT+jX7373Cb3P9e97/Q3/3//QdZ9H98f3xL7L+z30H+z3a3Dvpu//Y7/37X77v0P/4pXt6VqCz0AQClYBAcAIAnkQD55L0BAE/BsYQQDEggf4WYEQD0AQcDYRYPqM+6GD8Dp0RjQIB4RCI/A6QcL7EoQ8BIVOoJEAJgAJQoKQ10GQIOS5+Az+DuC8l4Dz+2ssPm94eXlu/o7PvngMrhsAYNsHo4Fz8PXw69jBx3uKx4y/Bvkaf8Z7M6D//Lr43TqP+esLx3jPH/y5fP0e0//NjF3nHqZfYIcTBiGcAgAAYgK0QIgQh4ATZAkWDBOABM8EHMEwCDYACPd5kQ0ArxBYPBABQyD5gQQYK5RPm/P9AIh24xqCBSmO+xNIBGD4LCr3oXMHROvP4d9ERQRHfBxeI0yD9z3e/7l9eP0LsvH7me89/Nh8bKM/juE3Dl0/HUAcjj3o4L8G5AYbnodgHTbQ8XcM/P6Iu2Nw2OPH/wz/Pnwffj/65/D5/fH45+Hr0d/e++zjxu+Hf6+T/y2Cw4fhWnwkC+BxKYQEFsGQCYRK2vYYj+R5vCBEIZcNhMcCH+YbGAwLCHSAEJBh0Ux/XMPuEUAICJFHg0AYABgB5H5D78XnIMjx+eE+/NvA/8XPCJrx78nfjz0DwUSQ8NoEIcIyx+G18P2b+z3+3X6GY51A5usY/X0YBuJ4AI4FoY7Mfvf+PZ9zHMh+Hf7GnyOYT8DxM30/np+T5/Ln8I8gI0gQAfg7Lq9oPmxPEhCEI7SItJgICFkt4mG4EoF6XwgyHhvAICCQ0yIg/K0g4T0Z+kZ+I9QhAAkMpnK8Hv8mCAgC/WbqynZ8Wwk+goMg4bWYfvH9zHO9Fr930O+XhO/zEFj8HcHE6zNnoIJ5bn0fH/tYzzC849i2n88ZnpbHzyUIwkHD/vrrx2vV4/sbOkZAwyDl8C0VKOlMnoSvhfMMglB3JqLROQQEIC8ASGAFYBF8CJMEIG/LngYSRsAIKAIxPB7hEIAHuNAmvYd/w7F4TIBOIBJ4+M3oPAPbEcB8H7p30O94jb5fAQCI3I/nM4mB5+E5+FqG/lbeP/d3+HqG5wr8bseCZ/x7ctzPw8kLjiPk+Xs+P5+Lx/wpE0R8hvCBY48lGPEcpogG+2wIsEEBnuE5Q0P0AFhTwVEmCL0QNPPsAKFmn4DUAIgCFsK2egZ0OoFBx7EeoUA0/B0sTiiSf6vH4rN4LZmH7+DOCoR0DAE50i4LgDyB5+vXc/9uvjcQj3PxgI7X5v3w3Px+fY4AP36e4b/D38n/8HmcB3l/PEd0Pz5f+J0BMAOOBiGUDhjJCBquJoNg5xyjCGtqYRrhGIBCYEhZTL3TwnKYpSFeQ2Bq9QmPhzVzsoAHBWXByw8eH3AEZPjxPvm3Mv3RHP9W7RMcvKYO/FkmL0LQcGAFPc9Bq0jQqP2D4FQ7D8bxOPx8o9eS9Rrm8/F/QOfm5xz9uYjPj/Z72NIE4OjPZQRCIA4H4eD3BP9zYNIpDR3LQkBFw1JRHMEHQD1weN0jED6lV5uL5xZ0mtdhyHviMwRZ4AwDR9QR7LB2ITCFL8CziCN8gBy/QMRUjN8jHMSDMlQNrxd/HoQzAUjwBCE0XH0oVIEVUD+H4TUBH3TN4Z+Pe2BM2I5ANjAY8ZwRe5L1/D3srR4+bPN5x7N0eI7R/eJrCUbv3e+f/8Hr+P0H4avnCz4Dnn2cfnkDq4Jq1QHCniiM0+8JBsM5vM9zEkAMh73CcT0QHxABxZ0e/JzOBj5h7JN7hFGYCFI+hg8J8wWFyH0NQArME6gkPqTSM/oBBf5NBRKISNFGKkyeM3JY/Jb7+8YBgY7KRMz74b2R+Rj8vgYnI/wtP5//5WMN31d4eH/6/JzA4P8+3p94PDjhNxr4uQZ/Xl7bB+Lw+x7vPuPfTzzwBu+H9+NbK4wADAVCmStJBZ0NH5AhMFxRQnSHwLDozgAy9TegCAIKR7UJwHACgb8hIDRlGQVwWDmGCkKAKOQOkBBYDGoBPvS54CkUGUURvPpOAKnni/YHfwMQYJgXmLS8Hj9bvx8nBPG6vB8erE3+Rcex+4MY8HMp/BH63BJH8XrDLJbfr+8AP+KtQz9P/j5+Pv4dQY/XzH0CYPRnCM/XH88f25+H+z0IU//CIT9vab0KIGoVwtE1PzytCQAHlRFKJNQAigQSzI9IHX6rsJjLJQQRnYFKFKoVAhCMABy0BnQ+clpaLR+W+QyqHj4EAISAY4oA0AkAABIK3wrxh9Xzq7Qhj5XoEly1R+sB0AYEaBb2eX1+f0Q8+rwWPm+/HxxhvrR+/8P3+b6PqBSBxt9xn3/vh7cJQgKF2wrOR6Ay7PZBM/r3vDcyBKMLLMPhNwjCIBAawxAvfVJvhqJC5jXACBKAR+oKpQy1FEo9Q7meQeiwVBStMX6GH6U3GQMCFP87wz1/r3+PkMD/s64xEBbRX1zv0Pt5HxqJ+BuaB2Hhcz+HYPr8fP0R+ocOAfN4AA6+fvT+vTP6Fz3+Pf1v+Ux+v3iP9n3s/Y4C4MhjP3BE/R+8D//Y/n55X3qsgxPUPT6NcJg/DBZ1vKBA/E07pAmZ8TsATgCRkFGhhbMRwHF4I6Qj9BpOD1oKKBK39IMKGNwDmggMQAgWQWgj+BB2CVAvrR6OpUN4IWFn6D2A43F4lDn83H6fRw0eHjDQIfw7P/u/+bB3Yx0vnoHvy4NtPODw7/HkH2Ex+Hr9c/K/fF8eGP5y4wA4wj/0P/nn8ePPy/EY5f8h9y4i9H8//AX6fK7whQM1LqHo+3x9sSzDEBz2ooRzOPQ9AQgn0EFBjJU4DQHhr90nJPjoGHSGIKWTU5k0BUKJs4oQWj7NOEZqCglCgk7A4s/S5xNAI4GjvxF2OG94fDB68A+3Dn4O/xsBMDSqoY/361C10d8j+/G/fe7vn4fdfrJw/I3+P78/tj2YCVwvGmzfGBBZx1H5H+f/HkD8XTg6Xj/4zP6+DpxcPt7P9HsAEETwZ+ww/4/+/z0bQByW7gW/1YIQeS0DEG6eRkewTgKcAGJqQ5UifBOAvF4IB+lYzAeHD/eaY3PBcJ4iYyAA6UwRgUhHtuvj7b7PaP/4/T11epXDCzJ+jizUBXgEAH3+3e3Ds3nsY+H9+OelQBO/+2fn5+db0nHhmR5/LQBwPJ8BeAOz/BUzUq3G72UecArB/H+nP0Nw0mH9WN/jWBEG9/m3HESsxjtBEAEHFuIghLgCAoiqyovwTw5+UkOaB9rCQqDVAh0jTOOCOhJAVhyeXK8nK5WXz8d2fB+vKcoYYh3mwX3+eN4nBxGO5nuMfN9v+DP4e+XzEKSy6KN1hH4/ah3Cx4Hfz/fjx4I4fPb40Y+Pv4kfDzD+3h//GwBxRD8zB/Xb+T3Po5+X+wQhH4vvqf/P9iHHI1B92/WnhLx+Q0AoyxX6j34fyp3OlGkQAEMQUnIUQpDyUSWH5XMYdVC2OoBTRhoh/SAT8N8vaxSh6Rl6m+EBHAdCBscJMIOR7sjw2/uN06L/GbYHRwr6e9g+4c+//z0qNDs/0hLh9fG96Dw6r4/D/B7/PvS+49hH/v5Y7+H47wx/9uRxPwP/Dd5n/D+7fA7hMeB8GIqY38yLGN4OGjqYLB4M6Uo/DwhD36DYZ9BBmRLkO77bSMhJQigBOisWKyQ4BUB2EI6A0CnpAKE/vo0KkjgC6P3HHu3w9nv4PlC0/BzBKzLlPZ+B38d9fo9F2f5zh/qNf4Ux/HMIXPfuMniPeE5flA8/x/91H/bH3+cL6MMD+vHvk7/luf3fPp/h5/d/y5E4+Af/+f7/qIs4nvP/ewjF4Z9hP+CXU36fDu3RgcJ14f7Eg9CDUUsZDCEZtgAYgiq0ggTa0NIRQaqRIBSKLBBQBFH0PoABUPA3BB/BQQCi4IAQ6FQ0fJ+AEwDD9mcBDvcJNv+3b2MwPdCiCBGdQKz2vqP7zyoSDh4F4nEAjLf/2P7jQehfC9+PP3/8/P4Y+T/rOW/bc/F3AXQ8TQD+0ffhL3eEfz0/3i+BxP8geOFY3/Ngu/p8EITDgau20qiQCE/hG4wqoFU0f8eAEG8ogCgYwg0ch4ACCB0DYAECBBXAw5zhPq+DFCMBp7CLEBjJXwQid4Rnb4EHqYHBw33+nH6f78X3I4p+P5G+5BP6/Vh/mvFu3P14h8d+Hh/H88f/eZzP4qCGvy8D66OGf7/etj8/d97eH+uz+L9wO1l7/rb4f3Qfto/3H7OPn0f2H4DQD+v3/XX4n3QYAhCHUztTSfAQHtdZh3QABw/5PC4FHyzSIVQz8m+FIAw4YHQBCOBwY7QQSL2CgxT8Xc7C7ePvD4CYN0oAif4bdV6yfwsEgpEV1a/rn9O/P1Qbcp//Vfh3/P3s59/r7/h9/LHxnpP34V8rP8e3Bx3i3/F9D0b/G/b5t0b+T/L/AlD8/4ZxLLq3v3/f5/d6v7n39eP+v4lggr/90rvhASj2h89Wxz5y/X7ng9fA6vLFMj9FQAhNw+8SCF1jVgUpsa8YrR9RI4oY9BtMf5i7hUB7n4/wtU35TNA4A4X/x0gCjUFQ6m9+L38HMIKPP3Y0v4/4f/v5+P298+j7+/35RPnnfqHP/Xq29P6fj///2v4T+erP9X5jLQGf9r/9e8Z6Fu/3+T6f8n33aT0rPp+f47e9Hv3eIzV9sCQY3z9ayCfvYaMIG3q/njWe/OsHgQIB4tdqBEB4F0BAQwhCZpBYBjkYQgEOKwcCD6E1hFcYJaGv4Yb6onQeOhUdF8ARcLnyUJG8Rqx/nPoC7e/bdyr+hr/L0RkCCRvfF4gl0Lh2H3U+LZxN27qfgMz35TbB4fee8B/H9m/l6P7xQJvf5zE/W9oHw2PYoH0f8mCr/Rl7HQdOf4wHJT+3P95TQ9u+zX3eQ9v+b38OtQkSLy5BBO17+F0D+gHA+YJN5/PF4vz2QAmn4b1kQQjAfWFLBxhEh8+RlQBtEDJtCJ2Oz2QqBDBxig/8y+GzG9r39RS+BX4ob4IwbBMc/N5/HsE1/Pa/A4j2/fv3bfgYANvfZ4jP+zavw/5b2z4I+Xe2h/Z9P78f3/fb/j7Df8+2/8zY5/k4w33Cg5B9/9/5z8D28D73fZv3z78fOmaHUz6BkMEIMOp3PYb65hTBsY10g9qD4HX3hz+VIOQXFmBnD3UPFzKIjq2Nwn0BQ04chKxLQFjTKsJ3QxDqv32BPCg0PPj4j3zftx2TA0DHgk78fvyO/Pv/27/HxP3R/gOIefjz2LzP+4nbsX1/nbH3sf354Z9L24Pfn//dvJ23/f38f7Cfe5u/fh0Q1pb+i7Dt+/3/4v4f4DP9+Qe/HrrfsL+9633b//d8DL+nv5X3pz8TgMx9EES8EAGI70MQQhhNt08AMQhBmG0IEJxfTpCAEACh7QeDp7vjN9kOSm2O+OF1/J38f0cQBjtC6b3jcK/Y5+/hOFhg2/f7Y/v789/H+Qy2/X+y8Puxv9U+Gos/hu37z+N2/HqP7TuOZzR+Hf5P/P+w7Y/z53bLfg4Y/x3454tA6p+H/z/8fL7v+x6cBIxvM89jSQJgDFeDQhDGFoROUQuBmNp2+OAjEQC/0QhC8ft0fM/zIxGE+bOjhwuL+axh4+Fj2S7+rf9s/n4AQH8+2hZ4/J2e97vL6/35ffjf+L896NT2e/+5+D2PNV6LDt/n+2rH+3m/F/8j8PM3d14f3+f/5m/zPvk+HEN4vcP3YZ/f4feLbfxfw7/zX2/L+/fH839UfO9+r37fb7Ptz8l97hOEpxAJeR2AGIJw0CKLNw3LsCCE12E3J40YhG6GS5DyO24soChNCAzWJSnQRr3GfR+POQYQ43//LwB+4oGjtg9L/Bu2/T5/RzDSj/A975d5k+Xf/k/e9/0hEMb3+LeOgsa/jz9f///z/vD/+e3hr3tk2/d9+3gA4vd8XvnPARB+/76Gff9f+n3fJwj5Ht4xMD0Kz5THC8GgNmTIcvJAlTaeLhBUhBUc7mvR9rE3JkrjIEJwH4Fw+EG2+R3wGevnCjBsGd634ft2bH/WWCCM7T3Zf93YHvYz5/fhb/z3P+/T/n7zc1HbbwNd/p8z1+e38d3y9o7hL3v6PUEIx7AtcMX+6zwO+wSKb4/ZP3Le2P6Y7WF/L6B4/upb7/vH3o+B+33b/+e8jn+ef70GgTAMhryNg9CHF0bnYBSB9g2D0EUTYYjfOARCMZ9xFAJRC0Q/AsB37Bv6fR8xRgAY+Z5//tA+AYK+P3+MP8bXED+n/zt+5+/jv4/XLj7m9+b/xvvtWPd7vH3/nP58Y/f9+frf8//n7/l/x/5H7uft/H58oOK+t3n/PBZ9gjC8l9/3YPQhhFGEP+h/XxyN5H0TiX7mP9TQ4ffYB0FIcfHw2xhFKCLDugFeRCAU+jxNKBAqNYJtG0UoYgx6Q0ThlghM9Pv+/v5/DPf9e/F93+Z4+/34f/gzY9v/lv8dHys+33/b/n8bf4z/H3+b5+PfY5v3HQ4VPuYgzR3PX++Dj43P3+f/11jH8Mf4Np8z+B7+jhCFgnBtsiJwo+YAAIx0hCD0B8GoEQh7aYxGD4BQQkXbH4whFMsZhIQ4Dd6YiV2WeRNyHBCyhqH6CBC9TgCMYPQ6bFxk+f22EJ9zOAjDZr5t+POF9z0IOcL4Ntu83uB1vR9//9j9KNAIoNjxd+z/+PWD28P7fny+T9v/u6O+Q+gP32d/rG34nP59PG/s/4ltvz8UQfz2eBCCGCCkYNy9Dx3iNHEOQQiy6PCwEHOYer6P/4CwKFV8x5+JgOIDH+fV/EhBxwqZJ3bS/D/Y9v8n9r2zx35/8O+4TfD4sZ9/x/P5a/N80fb3Hdv3/fxc8VhPMfY38PPctv+d2r7Pff4t/u7/n1cXjLxf/L8M9+M5fd8D0O/z/+Hzh22/H/s/RL7h//P/r6Ed77d+28MpFKGaKOrYjSJ0eMghCMJAD4YF0/GN4sfyhwwQjJyH/197PAIx+on6cNKIY4yvfef3x/HxY+fz1/X/Xm3vj1w4tj0w/P38e+bbhf/bx7eHz4me+/j7HMf4fe7jM+Hv4e+Ht3l9vjfscxzj5/3+2Pe+Ry8c3/e/HN/+f+4/f/i+f208L67jz+3/w2N+r/89eD4fFfh4/D3I6THt14nC3Y2NEMJqdwgKdCs6iNSFIOSdEoTM45CUYchBCCEQGcH6W3mK7dhRYQiE/rf8G78W78ff7/jt2N98psf/P/33OJ7nP1OnHz7/8O/n7Z32g/H//xj4+rUy8meT4hfH+no8B73/Xuzr5/4s/T6cz++PbPvn9OUK//n4Nn9H3z8v5z3X8c4fO4fv+zofr9kfP/y58Nnj/Xif/xj7/P9j2/8d2mP/H8EoQYJN9AOq1RlBSLFBACJ1cQIfBmkNQaj2CIhG3iiBL7U4WLmPEYgJFG5HmUUy8Pv8/rHP74+n4X0/jv1efHP8N29bP77v+z72/4/v8f24hWP4+n0/jt2O7ah9/Fr83+Z/v+Nr4H8P9f3vY3t4n9f2f8N9f3/7t/53/jhOiOGf8X38/x17/nj+/j2+zw2/H/z3vf/z/X1iCIGmeLQ+oAAHjSJQMuzwHzuLEMtlFPL6/HsBCPv8nH+b2/7/+f/+8fp+Hn7H34ttf47hYIj3/ffnz+3/9v25778Xfs9/Dv8bfg71/XfH+/5Y/7pjff/77Z/PN7aPn+Pb8f+nfd/mf+Vjw9cLbc9a9Lb/m/36N/b7efs8h+zHPtz3/+G/5+fwPv0+/4/v4/r6mZ4PewF4+H8YhIIAe0zF+AAAIABJREFU2o0GUi+rgZAC8XxOk9KZ28HrNREQQWSZ1wIAGQH4e/4+4z/PWz/fj+/7tr+/3/fP6/f9ftzmO70f/Rf7/v6xP5bfh+v79VYExPAZ/TX8eX3b7/Pz/Jr+P3ifj/tjfZv7fC9+H2CIgx/7Fzt8fbGN7xrb3pbD4t/+O7Z1Xn5W7vx70LH4hb/P6/h7+/3A9u/r8e/7f2LbHx9/Pwh/81+DwMXav38duR8szbBMo5xG3KjDI6K5WiOV7KBqJTn8YYIXqQZ0GCiM6IB0duzz71r5My7+n+rbY8/hX7/4e+x/TB7/m3g8t/kKfO4Qft+f29/Pt3kvdjz4fNvv+3a8f7zP+/4+Hts/b/Rc/m8CBP4z0Mf1RvaHh10/iT3+F/ptn18/H/5N+B7/B7YNvuyh9uj7/H54H/82njf2832f5/PH+fNj35+LE4K8xr/tIIQAXECBprPssg6hkIYUhAyXgC9snE7oHMyTjRxUKOBzBVYdpUojKED14iHn8Jd/m/+OWA8c/mBq1Ovn8G1/fj6D//9r2+/HL8D3h7f9vs4/LIqNNH79/lh+jv/++Lf6H9hC+Xb+H3wft+P3+/37Y+nB9o/XfQ8ov83z8Xv4/5nlx9/x97E/m5//25Gv+T+P9Qz43PwO8Xf8H/Hb/J/439c+/zev7zvf8Xf0bwhC/BJGFD4YQ0hT7B0hVaE8SRAql3UAC0GoqpyAgaK3IRitYEGhBaXPi0MhAiEBYxB8/nli3x/Lz+Hz+nYcEOH5hvfHtq/P6/tjfZfY93/Lz/f39cf6e4a23/fj+X0+Pg/b/ppDbf+ba/vnfCwgDo/x2P7v/Xl936uZ2PbX8NtxbPv/7n/Hth/H6/vj/X5/HIyiE4hKL4CRhRGE4Uuh0gdpD8KXw2/5VSSOIScggBQpE8AhIRDBQ2sYg3AYeAKGd/7Y5qfjvm/7z+X3eH2/n9vxN9zn7+PvfNv/3qLr+3b8Pv7v2PbH8/34Hn0f/49reH+/9oNOPN5n8V+BP16fX+jz+P4/Ppb/6/j30Pfv43u8r38Gfx0/+Xj8b/U/fCjHzggCy8SjZvnhF0n19TBMfPChGCEBIRVgtAtFqMrPEGN5BF9VA6H9LUZ+/+/z9+f4Y/7/O8b3jn/37+/v07L2/b357+P/cO7l+P8j3vfx9j4+v8/9+P58y98r3mls++PjcZ5G8vOFPu+Lz+HP7c/lj43/fd+/T2z7898/Sn7/r1tQ9D/xbgBG4b6+GAEYSmG2Y9gYjXAAb+0/hvY/mT/v8P38a/Ge/v/j+/5b+7/37fh/4u+P1+Hf4/3B6xn75/HH8+fH+7Dtz8P/fnQMH4+C8TH+3LHt++jfD7TQ+P7oY31j9eO9fft/TwD6/b/3e8S/H9/3x/pj6ZNdB+H/xPM5AA2A49g6BntE/1T+uP5feIT+d6MfLN4nRuuP+H9HvOd47T/vc/H+x/O4/p7+sz2I/fn4XX0fHzT6DP6++P3+3xh+rf7/9PP8b+rfw7d5P9+P3q8/P689/v34f2E/buPY/x3v79/Hsf39vu2vH2on+h4BoY/yvW4UoYUgnYJhEMR/l7nD+b/n/QAMH8N9vw9Puf0h8z8LPgNtPh7f2/Z/g3b8/WPfb59d/BzMff7+8XoA4n8lbvr3hI4T+yP7Y+D7//n78d/5bX/f+D/zff8b+D3eP75e7I9/T/F9f5+Dw78Ptj0IOQrxP4S2V8Y8RiPP7XQw5cHz+zb+TN+O4PD3Hd8f0Y5t/n2fef99fe/xr8fvx7/Hfh/b/l44777v9/H/8ffH5/t7xX3fl6f7v+W/z9+zxO/F7/nv4dvxz48WhP9vn38+jv8Mf87Y9/87/0Gx7889fN+//7BPEMb3G7A+IFJ/+A8BFhnuvhMGsCL7+Tm8n1+3//vY+/H7+fHx+5xYj+37a8V7+ba/nn9ffhu/j37L35+3+b2wHduf6/v7+rb/HmP7/nX7Y+P3i+34/t/e9v+N97nPv4/L/v7+3eD7PPbH8/r+e/ljPvZfO/7f4lge89H+GN/3n8V93/Z9Hht+eG0BISIoB0L+l1L7FMNsKwUjQcjPZPFHcKjfV3sUQkMoi7+H/3HwL/6X+O8R+zP2+36/X2jHY3kPb/t9O47/H7Y9EHHc6Pe4NyL+3sP7/hqPhb8e/r3/fP/3+P343p+Hbf878fdxfw0fRR71D+15iT+O5/fvOd73ny2n9dvx/uPtf/8eDMKRGX0igRBGkA66KA8HZXQfD4BhQJz/joIhtMPn8L/HMX7b/0Y+TuN/H3/u8P5i2/99Ztt/Bs8Q349/8X8bfh7+Hn8f/zf4P/i2f4/4Z/j98mPes9/3bX9/+E74m9/3/4n797btj+dz+3v4Pv82bvv32YYL8v14H77t7+/3eU0+n/+Oo+/b8f6+LwCKCckh+3yGUBMwB4CQ6VBWEzg8ABcCihCJojQm/D0PpHh+fwz3Azj5jL7jj6XN43/b8dr6vz3yNwH8+K1vj7hd/PPEa/nzeBAPB0ds+88/f3sE4iigEP8Dvv94IPTHx7b/r1v7QQDHT/UH1o0ADP8bP2/4Hv+vy/f/vm2dkJ+Dvv5vSuj2IPRg8PVeLBHxM6sPVoYgnAeifBCEfHwG8X4f2/E+ATR8v48jP+aPjW0/1v3Hd8L+WN+fx7d9mxMlQctz89q+HSY6/h/xb3+f/8++f3/83Pj9x38b+jzY9seFb/w+fg7f9p+VH+PfB8+tNq/Fa/v34NseYpjo4sRbGwJN2v4dsJ/6r8/rf87Ly8vw5gqFJZbzIUtDlvhkoYOh1pD/ygB1rBcjfPwb7+vb/j342/H/jLd9P97H7/P+8Jz34+vM98GpfT98v3if2PZt/OH/se2PjX3/P3Hbp7T+O/ljY9v/d7iN7xf/Q/j+4l+E24xlcn5/Pe/Xhq+/Tuj7fhz/3b/vmYdnH/67Hfr5onAQQjSkfZcGjM4hEIKfG4pj54d+c3hxH0W4T7BH/+z3/f18GzD8749Xj/1YfI3etv/mfn/stk2hQ59/Pn8fP3b8az72fb9Y3/s+L3b8PeL92PaPJftM+P56vD/+Hf/5w+35T6CL9+P7/hjY9t9Xh9+P439n/z6G/v58/KdY9g+2Q7+/JcDAgahOB0CIPlbESBQyOhN6oKjPazLqUF1lAMJh8OF/1N/uP8P3+e+obY3f6/jjY9/39/FtP+Jw28/H8br8d8T7+H6Y/P1+7Pt7+Gv4ff+ewmdEn/+M2PdtiIXw+ZHyj/KYLw4/BbafD8/rzxvb8Xv4/vH+rz+P7/N9/n982+/DmPJj4j/d/w5AqL8PAShUIthg5xCFnn0ofLcWjFYX8ghE62fobxD6Hzh8+z5/f/4P+GuOHvG5/fvH9/HH3Gds+3vw735b/fhZ+f3Y9+cff03f5n34fn+eb8e2P2bx+0ZbBx5/n/4X3tP+f4pj/hgD+Pj3E9t/y+vY9mN83+7D9+P7f32f35CR5e/P9f3DeZWFev4dXlo0JwlD3qE8/LO8F77w+Of1P2gRbR/P9+Xfn29jSOeNbf+b8D2P+vE+/vP8OSUYFjHEc+p4Hn/P2Pef7c8ffyN/X/x5P7b9PbF83PdvAhNPPHb8+n4cx/fz9+L7/n3xdfiz+3PH3+djPwvBxY7f9n2CMG7zd/Fv/Bvq0IzwyvDQH/kF5E2q+lB8EIShDX6jbyQaIuCcNQ1D+o/dC3f4923+J3//2PYf5vf9Pvd9m2P0D+L/+T7jiN/Rt+N9v+Pnf/+e4rZ/L3Pbv5Z4bPRe6fvJc9+L3+/7/O9if/f3130/3offj/2Y/Xg+f46fn/fz5xje9v+H+v6f+Gcbfyz/X79fxP9J/B3YnhB1SJ8jVx3THwDDcVDgHPqf8yP+nfH+OI7i+f3x/rn8/vh7x7b/nrHv/6vYH94f25iv6F/Hn9ePY7V9338X38d94/v98zzWPobX8ffxY76fH+snPeOPe7zjeD0cx/fh2iO+L/md4JjX5bf12/F6pWfYFf5mx5M0fKcLK6L8/0QfD0KIHgIe0nB0BsYGXxYQBjCq8hyBEQ/F62H/3+H3/TbzWn5fn1VfPxx4/P5Q37T9c/ixf7zY9s8hr+P3x7T58fGx9+HbefB6wPGI9/XH8P1y0JLtF/0Z+Lfx39yH+yO+/s/Iz+U5+Hnxu+OxB6O8B+/D/+3b457D/09/bj/2Y9/P/X/Ee3x0+yX3YFxOEI4eCEF6yByqH1ReH9cL/SZk2Pbn9P99uO+P5+fh+/qN+P3+WNzHj/2P0H8Q/Yd4rH/xvv/8uJ1/x2P5W+Nj+f35Ph/nm/7j8T6+f0z/39j/H2P8Y/zvxv/7/b/LD/GPHyUYx/s1l/8Hf70IPuM+/T4Fot+/n9p83+G+R8XPEut/x//7n3rnz+1/vv0vC99teP6h/nDg4gCGeX4p4sM9vhPwEwT+/sP24nP8GJ8Z2yP+x/8W335zv6/l9c7j8Dq4b7yf3v/n2P+H5+T17YtH6c/x7wfbj2kI+P2+Xvffj3/a/n5+HYv4v3g9vn/8veJj8XpD/8N/L/9fxn7s78Gu+1pV1oRj/XyX3s3nZP4T0hBEpMJJCEL4J9zPIIY+QelHdkY+wO8PvyaPQ2DH5/H3/+fv+X/g+/5v3+f9Y9tfh//N2D//WOz/b+bD8R7++4r7o7Rjm8/nP4v/iG/zvHyPvg3b+Dd/+7/xY74vbPPZ+P3537Ht28Nt3s/38Rj8DniP/D3Y9sf6++P9+P2x7f+92D3Vj8WfcN3iwwiE8jY/SCDyZ9j3n8VroO+3/X+h7f+P+/r3aPNAO3b8f0CbX9v+B3Hf3599/9nDf8v/4fH8w+XvFz7b91d6bLw2d+J/eKD6fbX9334/nhPjHx/b/l/weB+z7/+r2Pfn8u1437H7+Ia/9eP9fuH3+P7Y9sf5vv8o+H7/4nH2Xfy38gYEQnx5CD4Df17/UP+jn+O3+Xn4XIj/H78fvx8/B49D28f2bTy2+PHXHG77Y72/x+3479WPH2+f5+b7Rdufx+8/HiD9e4n3fz2AY4/Px7b/r31+D0L+hgqzv/r8C/K5vj+P/5f+fPb98T7j+P4/Pvbs2Pff3d+3E0Fep0K5MvgyDwEhdUJqP57E2X9hvo/+i/pxHPGz/fvy/f8PjPj/zb5/Hh5b9/8i9vn33LfGfn8+XKv5+63ar/3/9Tm8sLw+vjf3PXH7P0/n+2qP+R4/LvCDw+cb78vv48f/3Gbqz/w/8f1y/HpDtHm/f3Tp/Ip0/g/zPXRQJztHToQy9scFQfxj/Z/x87Dln4t93x/f4X0//m+2fYf34+vG/xH7v+8Rr+77/juN8P8n4S4Lk+zfgLC8GmzjfPbmt+Pn+P/wv+O+fizbPF94rzh23+H9+H95n/Oz4j1iX+zfN94/Xgvb8ft8oPaPt297f477iH3/H/jP9WPf9n1+zt/Tf0d/ZATBq+lXy/PJ+B2ygLxY/B3rS48HYX4u/H/xfPt/tfk9H+v+HcfvD//b7/P3jePxPfG9eDz2z7Nr+3H8P8/H1x67/h/zf8T2oxTH+v74HvG6Y7d5Lv7H3p9tfw7/e/wP2fY+4d/7+B2f/X7st/n37cD6S50fn2kfqNn6ov6B/V/8/aMfF8f4+OujL7rw/+fv978X7vl8Gz/++b/Nfzd/Ht+G18vfx7Y/Bj8k9v33Ef8P/H0+/t/H7uOPff+5o+8bx/Gx/D78F/D/v/P9x/M/PjZ/XHzs+H/jH8d/f+5Hn0/8fw+/f/wf/D+n/d/0/w/vj9/32vDh/j8sLpW/CEL4Bx9v7IeCGJ5uvE5+v/F+jJ/zY7y/YH0e4//e7+Pf+Ly/7h/rDy/+fx67P/x34/uvh3/Ha8Rji/f3+3y/n/z0x3nt0B/rH8uP/XH4G348tv11/PH5OeJ+jP2x/j7D/cfPx+c/f/3+P47H4jf8//73xn3+3n8rfQjC0nILQhIM/0L99+C/8yP0efj+HsvT2Pdjf67YH/nbH++PxfH+O/tr8j4P3x/xY3/s4/3H/+e/z3jfeC/4z/3r8f8Dn8X/eP/P9sfHvp8A9fvD2z/S9veM1+Pf+XH+HvHzZF8cBEM+sRyP+H/x72N/+O/f3+PxPo7f8//R9+Pb/pyb5BOIi1sCBFNlbwchvkPP8T98GEt7zP/DH+8Y8TP9Z8Vj/XGxH/v6nPi+8X3C/4n34e3hNq8d+3y/PPb36Xn9YwJ4/P2x7Y/x7+O3P8t/r/xYf41/xbY/V3hdu+33/XWO3R/+93+/H973x/H/PB7dA98Pfz98LP9b/H/u+2P4G//s47+XPB7+fYjBkH0EISWjH3Gg4v/iuP1+gvGxvj/vn/f7sR//Z29/fP++2D/8fvhftu2v7dujYT7gP9y2fby2P4bH8rOxH98D//8ftu1/4o/R/T+4+//E60b74B/xvXk/2Pbn8td9PP/zx/vr+PPwe2v/5mj//D8JxPxLPE7aP2gN0yC2o4/PP9jfM/4j3x5+D+Py4+PzHvX3P0b87cB/9cD376V4fvyMx9r+PmN/f47/Tzj/cT3/P+Pn/2es/4P1P8L/F//3w9+Pfz7+/wf/H9/z+z+P7f/v2Hbff/T5/XuIr+N6/P8A5v+//vb98zA+/t7D+36A71tfPzveH+M/8oD0n237fenv4b+L238p/PvAfsb/P94z/v6/t+1fR2z79xX/h+MZR/qP1/7z/f/j+z9+v/Y/Cfv+/WE//g/+J/z/P/Z9/f98//fx/xPH/n35e8X3G+4f/T/4P+M+3zdfm79v/j/Hvke+f/+fY3/49/+3bf+z0Q5RcfsZnh85/lh8D/x/+P7/d9v+zI6+r9j+4+O/h38P+ffz8P4yQN4wAD3b/m1i28duE/Uf7nhgBBDCj4/fF/q+/a/8+Ef1r38v8Tj/Pv0+/oP3xftzP/5/8Mfwe+P/OfZ4HE8H3+c/P36ffp+fG/vx/+L/Ee/3vP+4ff9e475/r/5v9r2+f2x/B2P/B/y9vw78R+of8eP8d4l9/5v/xzZ/z/uP3f4LY//+H//r3v/3/y/tH+2b/vf+H+z3+f6Pgn/08e+D70X9+H78Tvk54/dh/Hj8f3gd/x59+/H2832P3H88f/34f/z7z3+P+Hy/P/r9Yv343fX7RH2+L3yP8W18B3+Mf594P/Z9ff33jx//vfH79ffN/fj94/x7+F2+N3yf/r+J98Pfk/t+vz/3/2Z7tL+//yT8f8b3j8/Hj4/D74Ht+P5i3383P/b34w/xD4bvQfT/Nzk/o0UnfhA+p/9A/Hjfj3+Tn+Pvu+//V/yB8Hr4f+L78H2M+P+Ix/lr+uv6+/v78/+Mv+9/d3z/+D3i/6s+H5u/x/Hxf/N7P/b3x/A//b8Z/1/xb/2+H/vxgWj8/Xjf/P1iPx4T+3wf/n+P+77vr+vbfJ/4f+L78D7+/vv4/vH/v4/tH/y/j78/vx/vH+//mrY7Tsfvl/s8Hvf9/v9rm/+X5+r4/6cH3hyPPwSb37nO70P/x+/7Pr4b/l/H+n1+L/zfvz/8fvA++L3x/b3v2z6H+HzY/i+2+T+w/Q9GPIL6sPjgr/Uj+kIf+/75ffw3w/04Utv/L3/f/P+N7fh9/f+jfe/Hfv5+8G+/I/v+vfJ/8vcLx+B7DX8f/j+1/T6/R+w7v+/v4/+rfz58f7v//f+H/f8D4sf/i/g/eB3f9v/j2PblPPwP8Qf4P9D3x3+n/HX8sf/9tn9d/h/j74zfT/y+eH3+H/A+/r3Hvm/H/vD/O3YP/Q/8rXwf4/v8b7d5nf73/4/tn9f3jx8Y+f8HXy/P/+ffn/+/x39f+P73YPl8+f+N36H+/+3ve+x7e/xz+T7/z/8G/v/+/9n+f/H4f4/vz3+v+In9OPYPnx/fn/6CfhT/WP//8PPG7+P7fP/6fxH/f/xPg3/7vu3bx/XvH+P7C98/zv9//L/x+fI1Dr9v/L/3/wd+f/+a+X/4f/nfH/vn8/+D27Hv4/8H/6N/n+P9H+L/8L+J/4P/F/sf/H0N9v0F8fvy/tj2x8T+P7vtP2j4Pfj/4Pv8/8f/N37/+H/5/f/v2L4P/+H/9df/77f9D/Xn8t8x/r2/X/x+/f43/I0/Lh4b/z/eP2P8n/x/xv/z/zTG98fvf/i/D/bj+Xw/3h9+f+zHi/L//+T+b//P/v8B/x//+3g/z/H/h9+//F/e9v3/2/pH79fvh/89tH3f+H3+W9v8/9j+P4n9x3r/8XvF6/N547Hv+/7b93mf5Md+7M/NPv6P/zm2/9D/zfm5Pj/m/fPnxf3h+/3+Q/17+X8S/x+/X/w/Pj7jn+P/v9j3fZ6P98f/89j+D+L/Tfw/H+v/WfznDA4e+P+O/4f/5/j9x28Y/wP///j/4n/vY38N/33x//pXb///6P8B";

export function gerarRelatorioPDF(dados) {
    const doc = new jsPDF("p", "mm", "a4");
    const pageW = 210;
    const margin = 14;
    const colW = (pageW - 2 * margin) / 2;

    let y = 20;

    doc.addImage(LOGO_BASE64, "PNG", margin, y - 8, 30, 10);

    function titulo(texto) {
        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(texto, margin + 34, y);
        y += 8;
    }

    function subtitulo(texto) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(texto, margin, y);
        y += 6;
    }

    function linha() {
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, y, pageW - margin, y);
        y += 4;
    }

    function kpi(label, valor, meta) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(label, margin, y);
        doc.setFontSize(13);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "bold");
        doc.text(String(valor), margin + 2, y + 6);
        if (meta !== undefined) {
            doc.setFontSize(7);
            const acimaMeta = valor >= meta;
            if (meta >= 0) {
                doc.setTextColor(acimaMeta ? 0 : 200, acimaMeta ? 150 : 50, acimaMeta ? 0 : 50);
            } else {
                doc.setTextColor(136, 136, 136);
            }
            doc.text(`Meta: ${meta}`, margin + 2, y + 12);
        }
        doc.setFont("helvetica", "normal");
        y += meta !== undefined ? 20 : 14;
    }

    titulo("Makro Executive Dashboard");
    subtitulo(`Relatório gerado em ${new Date().toLocaleString("pt-BR")}`);
    linha();

    if (dados?.kpis) {
        titulo("Indicadores");
        for (const [k, v] of Object.entries(dados.kpis)) {
            kpi(k, v, null);
        }
        linha();
    }

    if (dados?.metas) {
        titulo("Metas");
        for (const [k, v] of Object.entries(METAS)) {
            kpi(k, v, null);
        }
        linha();
    }

    if (dados?.tabela?.length > 0) {
        titulo("Tabela de Dados");
        const headers = Object.keys(dados.tabela[0]);
        const rows = dados.tabela.map(r => headers.map(h => r[h]));
        autoTable(doc, {
            startY: y,
            head: [headers],
            body: rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [245, 245, 245] },
        });
        y = (doc.lastAutoTable?.finalY || y) + 10;
    }

    if (dados?.insights?.length > 0) {
        if (y > 250) { doc.addPage(); y = 20; }
        titulo("Insights");
        doc.setFontSize(9);
        dados.insights.forEach((ins, i) => {
            if (y > 275) { doc.addPage(); y = 20; }
            doc.setTextColor(40, 40, 40);
            doc.text(`${i + 1}. ${ins}`, margin, y);
            y += 5;
        });
    }

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("Makro Executive Dashboard — Confidencial", margin, 290);

    doc.save("relatorio_dashboard.pdf");
}
